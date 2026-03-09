import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json() as {
      token?: string;
      name?: string;
      email?: string;
      password?: string;
    };

    const { token, name, email, password } = body;

    if (!token || !name || !email || !password) {
      return json({ error: 'missing_params' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validate invite — must be pending and not expired
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('id, coach_id, status, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError || !invite) {
      return json({ error: 'invalid_token', reason: 'not_found' }, 400);
    }

    if (invite.status === 'used') {
      return json({ error: 'invalid_token', reason: 'used' }, 400);
    }
    if (invite.status === 'revoked') {
      return json({ error: 'invalid_token', reason: 'revoked' }, 400);
    }
    if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
      return json({ error: 'invalid_token', reason: 'expired' }, 400);
    }

    // Create athlete account — role set via user_metadata, applied by handle_new_user trigger
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'athlete' },
    });

    if (createError) {
      if (createError.message?.includes('already been registered') ||
          createError.message?.includes('already exists')) {
        return json({ error: 'email_taken' }, 400);
      }
      return json({ error: 'internal_error' }, 500);
    }

    const newUser = newUserData.user;
    if (!newUser) {
      return json({ error: 'internal_error' }, 500);
    }

    // Link athlete to coach
    const { error: linkError } = await supabase
      .from('coach_athletes')
      .insert({ coach_id: invite.coach_id, athlete_id: newUser.id });

    if (linkError) {
      // Rollback: delete the orphaned user
      await supabase.auth.admin.deleteUser(newUser.id);
      return json({ error: 'internal_error' }, 500);
    }

    // Mark invite as used
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'used',
        used_by: newUser.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Failed to mark invite as used:', updateError);
      // Non-fatal — user and link already created
    }

    return json({ success: true });
  } catch {
    return json({ error: 'internal_error' }, 500);
  }
});

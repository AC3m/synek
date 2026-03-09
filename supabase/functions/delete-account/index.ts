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
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }
    const jwt = authHeader.slice(7);

    // Verify JWT and extract userId using the anon client
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: 'unauthorized' }, 401);
    }
    const userId = userData.user.id;

    // Admin client for privileged operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Step 1 — FR-026: Immediately revoke all pending invites issued by this coach
    await adminClient
      .from('invites')
      .update({ status: 'revoked' })
      .eq('coach_id', userId)
      .eq('status', 'pending');

    // Step 2 — FR-022: Anonymise invite FK references for audit trail
    await adminClient
      .from('invites')
      .update({ coach_id: null })
      .eq('coach_id', userId);

    await adminClient
      .from('invites')
      .update({ used_by: null })
      .eq('used_by', userId);

    // Step 3: Anonymise profile (belt-and-suspenders before cascade)
    await adminClient
      .from('profiles')
      .update({
        name: 'Deleted User',
      })
      .eq('id', userId);

    // Step 4: Delete auth user — cascades to profiles via FK
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete user:', deleteError);
      return json({ error: 'internal_error' }, 500);
    }

    return json({ success: true });
  } catch {
    return json({ error: 'internal_error' }, 500);
  }
});

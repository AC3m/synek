import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Duplicated from app/lib/config.ts DAILY_COACH_REGISTRATION_LIMIT
const DAILY_COACH_REGISTRATION_LIMIT = 5;

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
      name?: string;
      email?: string;
      password?: string;
    };

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return json({ error: 'missing_params' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate-limit: count coach profiles created today (calendar day, UTC midnight)
    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'coach')
      .gte('created_at', utcMidnight.toISOString());

    if (countError) {
      return json({ error: 'internal_error' }, 500);
    }

    if ((count ?? 0) >= DAILY_COACH_REGISTRATION_LIMIT) {
      return json({ error: 'coach_limit_reached' }, 429);
    }

    // Create coach account — role set via user_metadata, applied by handle_new_user trigger
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'coach' },
    });

    if (createError) {
      if (
        createError.message?.includes('already been registered') ||
        createError.message?.includes('already exists')
      ) {
        return json({ error: 'email_taken' }, 400);
      }
      return json({ error: 'internal_error' }, 500);
    }

    return json({ success: true });
  } catch {
    return json({ error: 'internal_error' }, 500);
  }
});

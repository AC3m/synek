import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Duplicated from app/lib/config.ts — keep in sync
const DAILY_COACH_REGISTRATION_LIMIT = 5;
const DAILY_ATHLETE_REGISTRATION_LIMIT = 10;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_DIGIT = /[0-9]/;

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
      role?: string;
      website?: string;
    };

    const { name, email, password, role, website } = body;

    // Honeypot — bots fill this, real browsers leave it empty
    if (website) {
      return json({ success: true });
    }

    if (!name || !email || !password) {
      return json({ error: 'missing_params' }, 400);
    }

    if (role !== 'coach' && role !== 'athlete') {
      return json({ error: 'invalid_role' }, 400);
    }

    // Server-side password policy (mirrors client-side Zod schema)
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      !PASSWORD_UPPERCASE.test(password) ||
      !PASSWORD_DIGIT.test(password)
    ) {
      return json({ error: 'weak_password' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);

    const limit = role === 'coach' ? DAILY_COACH_REGISTRATION_LIMIT : DAILY_ATHLETE_REGISTRATION_LIMIT;

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', role)
      .gte('created_at', utcMidnight.toISOString());

    if (countError) {
      return json({ error: 'internal_error' }, 500);
    }

    if ((count ?? 0) >= limit) {
      return json({ error: role === 'coach' ? 'coach_limit_reached' : 'athlete_limit_reached' }, 429);
    }

    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
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

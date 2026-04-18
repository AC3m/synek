import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Duplicated from app/lib/config.ts — keep in sync
const DAILY_COACH_REGISTRATION_LIMIT = 5;
const DAILY_ATHLETE_REGISTRATION_LIMIT = 10;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_DIGIT = /[0-9]/;

// Rate limit constants
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY — injected by Supabase runtime
//   TURNSTILE_SECRET_KEY — set via: supabase secrets set TURNSTILE_SECRET_KEY=...
//   APP_URL — set via: supabase secrets set APP_URL=https://<your-domain>

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

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: Deno.env.get('TURNSTILE_SECRET_KEY'),
      response: token,
      remoteip: ip,
    }),
  });
  const data = (await res.json()) as { success: boolean };
  return data.success;
}

import { checkAndIncrementRateLimit } from './rate-limit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      locale?: string;
      website?: string;
      cfToken?: string;
    };

    const { name, email, password, role, locale, website, cfToken } = body;

    // 1. Honeypot — bots fill this, real browsers leave it empty
    if (website) {
      console.log('[register] honeypot triggered');
      return json({ success: true });
    }

    // 2. Turnstile token verification
    const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown')
      .split(',')[0]
      .trim();
    if (!cfToken) {
      console.log('[register] turnstile_failed: missing cfToken', { ip });
      return json({ error: 'turnstile_failed' }, 400);
    }
    const turnstileOk = await verifyTurnstile(cfToken, ip);
    if (!turnstileOk) {
      console.log('[register] turnstile_failed: verification failed', { ip });
      return json({ error: 'turnstile_failed' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3. IP rate limit check
    const allowed = await checkAndIncrementRateLimit(
      supabase,
      ip,
      'register',
      RATE_LIMIT_WINDOW_MINUTES,
      RATE_LIMIT_MAX_ATTEMPTS,
    );
    if (!allowed) {
      console.log('[register] rate_limited', { ip });
      return json({ error: 'rate_limited' }, 429);
    }

    // 4. Input validation
    if (!name || !email || !password) {
      console.log('[register] missing_params', {
        ip,
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
      });
      return json({ error: 'missing_params' }, 400);
    }

    if (role !== 'coach' && role !== 'athlete') {
      console.log('[register] invalid_role', { ip, role });
      return json({ error: 'invalid_role' }, 400);
    }

    // Server-side password policy (mirrors client-side Zod schema)
    if (
      password.length < PASSWORD_MIN_LENGTH ||
      !PASSWORD_UPPERCASE.test(password) ||
      !PASSWORD_DIGIT.test(password)
    ) {
      console.log('[register] weak_password', { ip });
      return json({ error: 'weak_password' }, 400);
    }

    // 5. Beta slot limit check
    const utcMidnight = new Date();
    utcMidnight.setUTCHours(0, 0, 0, 0);

    const limit =
      role === 'coach' ? DAILY_COACH_REGISTRATION_LIMIT : DAILY_ATHLETE_REGISTRATION_LIMIT;

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', role)
      .gte('created_at', utcMidnight.toISOString());

    if (countError) {
      console.log('[register] profiles count error', {
        error: countError.message,
        code: countError.code,
      });
      return json({ error: 'internal_error' }, 500);
    }

    if ((count ?? 0) >= limit) {
      console.log('[register] slot_limit_reached', { ip, role, count, limit });
      return json(
        { error: role === 'coach' ? 'coach_limit_reached' : 'athlete_limit_reached' },
        429,
      );
    }

    // 6. Pre-check for existing email so we can return a clear error.
    //    Then create the user via auth.signUp() which atomically creates the account
    //    AND sends the confirmation email in one operation — unlike generateLink() which
    //    sets the rate-limit timestamp without sending any email, causing the follow-up
    //    resend() to be rejected with 429 immediately.
    const appUrl =
      Deno.env.get('APP_URL') ?? 'https://synek-619tdcw60-arturs-projects-dc508db2.vercel.app';

    // Indexed lookup instead of loading all users
    const { data: existing } = await supabase.rpc('lookup_user_by_email', {
      lookup_email: email,
    });

    if (existing) {
      if (!existing.email_confirmed_at) {
        // Unconfirmed account — resend the confirmation email
        const anonSupabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        );
        try {
          await anonSupabase.auth.resend({ type: 'signup', email });
          console.log('[register] confirmation_resent for unconfirmed account', { email });
          return json({ success: true, status: 'confirmation_resent' });
        } catch {
          // Fall through to email_taken if resend fails
        }
      }
      console.log('[register] email_taken', { ip, email });
      return json({ error: 'email_taken' }, 400);
    }

    // Anon client: auth.signUp() must be called with the anon key (public endpoint)
    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    // auth.signUp() creates the user AND sends the confirmation email atomically
    const { data: signUpData, error: signUpError } = await anonSupabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, language: locale ?? 'en' },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (signUpError) {
      console.log('[register] signUp error', {
        email,
        error: signUpError.message,
        status: signUpError.status,
      });
      const msg = signUpError.message?.toLowerCase() ?? '';
      if (
        msg.includes('already been registered') ||
        msg.includes('already exists') ||
        msg.includes('email address has already been registered') ||
        msg.includes('user already registered')
      ) {
        return json({ error: 'email_taken' }, 400);
      }
      if (signUpError.status === 429 || msg.includes('rate limit') || msg.includes('over_email')) {
        return json({ error: 'rate_limited' }, 429);
      }
      if (signUpError.status === 400 && (msg.includes('invalid') || msg.includes('email'))) {
        return json({ error: 'invalid_email' }, 400);
      }
      return json({ error: 'internal_error' }, 500);
    }

    console.log('[register] account_created', { email, role, userId: signUpData.user?.id });
    return json({ success: true });
  } catch (err) {
    console.log('[register] unhandled exception', { error: String(err) });
    return json({ error: 'internal_error' }, 500);
  }
});

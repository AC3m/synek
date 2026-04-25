import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkAndIncrementRateLimit } from '../register-user/rate-limit.ts';

// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected by Supabase runtime
//   TURNSTILE_SECRET_KEY — bot check
//   RESEND_API_KEY — email delivery
//   SUPPORT_FROM (optional) — defaults to support@synek.app
//   SUPPORT_TO (optional) — defaults to hello@synek.app

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 5000;

const VALID_CATEGORIES = ['general', 'bug', 'strava', 'account'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

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

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendSupportEmail(payload: {
  name: string;
  email: string;
  message: string;
  category: Category | null;
  userId: string | null;
}): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.log('[submit-support] RESEND_API_KEY missing — skipping email');
    return false;
  }

  const from = Deno.env.get('SUPPORT_FROM') ?? 'SYNEK Support <support@synek.app>';
  const to = Deno.env.get('SUPPORT_TO') ?? 'hello@synek.app';
  const categoryLabel = payload.category ?? 'general';
  const subject = `[Support / ${categoryLabel}] ${payload.name}`;

  const text =
    `New support request\n\n` +
    `Name: ${payload.name}\n` +
    `Email: ${payload.email}\n` +
    `Category: ${categoryLabel}\n` +
    `User ID: ${payload.userId ?? 'anonymous'}\n\n` +
    `Message:\n${payload.message}\n`;

  const html =
    `<h2>New support request</h2>` +
    `<p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>` +
    `<p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>` +
    `<p><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>` +
    `<p><strong>User ID:</strong> ${escapeHtml(payload.userId ?? 'anonymous')}</p>` +
    `<hr/>` +
    `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(payload.message)}</pre>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: payload.email,
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log('[submit-support] resend send failed', { status: res.status, body: errText });
      return false;
    }
    return true;
  } catch (err) {
    console.log('[submit-support] resend exception', { error: String(err) });
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      message?: string;
      category?: string;
      userId?: string;
      website?: string;
      cfToken?: string;
    };

    const { name, email, message, category, userId, website, cfToken } = body;

    // 1. Honeypot
    if (website) {
      console.log('[submit-support] honeypot triggered');
      return json({ success: true });
    }

    // 2. Turnstile
    const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown')
      .split(',')[0]
      .trim();
    if (!cfToken) {
      console.log('[submit-support] turnstile_failed: missing cfToken', { ip });
      return json({ error: 'turnstile_failed' }, 400);
    }
    const turnstileOk = await verifyTurnstile(cfToken, ip);
    if (!turnstileOk) {
      console.log('[submit-support] turnstile_failed: verification failed', { ip });
      return json({ error: 'turnstile_failed' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3. IP rate limit
    const allowed = await checkAndIncrementRateLimit(
      supabase,
      ip,
      'support',
      RATE_LIMIT_WINDOW_MINUTES,
      RATE_LIMIT_MAX_ATTEMPTS,
    );
    if (!allowed) {
      console.log('[submit-support] rate_limited', { ip });
      return json({ error: 'rate_limited' }, 429);
    }

    // 4. Validation
    if (!name || !email || !message) {
      return json({ error: 'missing_params' }, 400);
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (
      trimmedName.length === 0 ||
      trimmedName.length > MAX_NAME_LENGTH ||
      trimmedEmail.length === 0 ||
      trimmedEmail.length > MAX_EMAIL_LENGTH ||
      trimmedMessage.length === 0 ||
      trimmedMessage.length > MAX_MESSAGE_LENGTH
    ) {
      return json({ error: 'invalid_params' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return json({ error: 'invalid_email' }, 400);
    }

    let resolvedCategory: Category | null = null;
    if (category) {
      if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
        return json({ error: 'invalid_category' }, 400);
      }
      resolvedCategory = category as Category;
    }

    const resolvedUserId = userId && userId.length > 0 ? userId : null;

    // 5. Insert into DB (source of truth — even if email later fails)
    const { error: insertError } = await supabase.from('feedback_submissions').insert({
      kind: 'support',
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      category: resolvedCategory,
      user_id: resolvedUserId,
    });

    if (insertError) {
      console.log('[submit-support] insert failed', {
        error: insertError.message,
        code: insertError.code,
      });
      return json({ error: 'internal_error' }, 500);
    }

    // 6. Send email (fire-and-forget — DB row already persisted)
    const emailSent = await sendSupportEmail({
      name: trimmedName,
      email: trimmedEmail,
      message: trimmedMessage,
      category: resolvedCategory,
      userId: resolvedUserId,
    });

    console.log('[submit-support] received', {
      emailSent,
      category: resolvedCategory,
      userId: resolvedUserId,
    });

    return json({ success: true });
  } catch (err) {
    console.log('[submit-support] unhandled exception', { error: String(err) });
    return json({ error: 'internal_error' }, 500);
  }
});

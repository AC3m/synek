// PoC: Junction Garmin integration — remove after evaluation
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

/**
 * Verify a Svix webhook signature manually using Web Crypto API.
 * Svix signs: "{svix-id}.{svix-timestamp}.{rawBody}" with HMAC-SHA256.
 * The secret is base64-encoded after the "whsec_" prefix.
 */
async function verifySvixSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> {
  // Reject timestamps older than 5 minutes to prevent replay attacks
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Extract base64 key from "whsec_<base64>"
  const base64Key = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signedContent),
  );

  const computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // svix-signature header may contain multiple space-delimited "v1,<sig>" entries
  return svixSignature.split(' ').some((part) => {
    const sig = part.startsWith('v1,') ? part.slice(3) : part;
    return sig === computedSig;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Read raw body as text BEFORE any parsing — verification requires the raw string
  const rawBody = await req.text();

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return json({ error: 'missing_svix_headers' }, 400);
  }

  const webhookSecret = Deno.env.get('JUNCTION_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('JUNCTION_WEBHOOK_SECRET not configured');
    return json({ error: 'missing_secret' }, 500);
  }

  const valid = await verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, webhookSecret);
  if (!valid) {
    console.error('Svix verification failed');
    return json({ error: 'invalid_signature' }, 400);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const junctionUserId = payload.user_id as string | undefined;
  const eventType = payload.event_type as string | undefined;

  if (!junctionUserId || !eventType) {
    return json({ error: 'invalid_payload' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Check that this Junction user has an active connection
  const { data: connection, error: connErr } = await supabase
    .from('junction_poc_connections')
    .select('id')
    .eq('junction_user_id', junctionUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (connErr) {
    console.error('DB error checking connection:', connErr);
    return json({ error: 'db_error' }, 500);
  }

  if (!connection) {
    return json({ error: 'user_not_found' }, 404);
  }

  // Deduplicate by svix-id
  const { data: existing, error: dupErr } = await supabase
    .from('junction_poc_events')
    .select('id')
    .eq('svix_event_id', svixId)
    .maybeSingle();

  if (dupErr) {
    console.error('DB error checking duplicate:', dupErr);
    return json({ error: 'db_error' }, 500);
  }

  if (existing) {
    return json({ received: true, duplicate: true }, 409);
  }

  // Store the full raw envelope
  const { error: insertErr } = await supabase
    .from('junction_poc_events')
    .insert({
      junction_user_id: junctionUserId,
      svix_event_id: svixId,
      event_type: eventType,
      payload,
    });

  if (insertErr) {
    console.error('DB insert error:', insertErr);
    return json({ error: 'db_error' }, 500);
  }

  return json({ received: true });
});

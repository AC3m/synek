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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Verify caller JWT and extract app user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'missing_auth' }, 401);
    const token = authHeader.slice(7);

    // Use the anon client + getClaims for local JWT verification (no network round-trip).
    // This works correctly with ES256 asymmetric tokens issued by this Supabase project.
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: 'unauthorized' }, 401);

    const appUserId = claimsData.claims.sub as string;
    const apiKey = Deno.env.get('JUNCTION_API_KEY');
    const apiBase = Deno.env.get('JUNCTION_API_BASE_URL') ?? 'https://api.sandbox.tryvital.io';

    if (!apiKey) return json({ error: 'missing_api_key' }, 500);

    // Step 1: Create (or retrieve existing) Junction user
    let junctionUserId: string;

    const createUserRes = await fetch(`${apiBase}/v2/user`, {
      method: 'POST',
      headers: {
        'x-vital-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_user_id: appUserId }),
    });

    if (createUserRes.ok) {
      const userData = await createUserRes.json() as { user_id: string };
      junctionUserId = userData.user_id;
    } else if (createUserRes.status === 400) {
      // Duplicate client_user_id — Junction returns user_id nested under detail
      const errData = await createUserRes.json() as { user_id?: string; detail?: { user_id?: string } };
      const existingUserId = errData.user_id ?? errData.detail?.user_id;
      if (!existingUserId) {
        console.error('Junction 400 without user_id:', JSON.stringify(errData));
        return json({ error: 'junction_user_error', status: 400, body: errData }, 502);
      }
      junctionUserId = existingUserId;
    } else {
      const errBody = await createUserRes.text().catch(() => '');
      console.error(`Junction create user failed (${createUserRes.status}):`, errBody);
      return json({ error: 'junction_user_error' }, 502);
    }

    // Step 2: Generate link token for the Garmin provider
    const tokenRes = await fetch(`${apiBase}/v2/link/token`, {
      method: 'POST',
      headers: {
        'x-vital-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ user_id: junctionUserId, provider: 'garmin' }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => '');
      console.error(`Junction link token failed (${tokenRes.status}):`, errBody);
      return json({ error: 'link_token_error' }, 502);
    }

    const tokenData = await tokenRes.json() as { link_token: string; link_web_url: string };

    return json({ linkToken: tokenData.link_token, linkWebUrl: tokenData.link_web_url, junctionUserId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('junction-create-user unexpected error:', err);
    return json({ error: 'internal_error', detail: message }, 500);
  }
});

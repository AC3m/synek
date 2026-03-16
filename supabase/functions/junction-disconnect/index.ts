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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the active connection
    const { data: connection, error: connErr } = await supabase
      .from('junction_poc_connections')
      .select('id, junction_user_id')
      .eq('app_user_id', claimsData.claims.sub)
      .eq('status', 'active')
      .maybeSingle();

    if (connErr) return json({ error: 'db_error' }, 500);
    if (!connection) return json({ error: 'not_connected' }, 404);

    const junctionUserId = connection.junction_user_id as string;
    const apiKey = Deno.env.get('JUNCTION_API_KEY');
    const apiBase = Deno.env.get('JUNCTION_API_BASE_URL') ?? 'https://api.sandbox.tryvital.io';

    // Deregister provider from Junction — log but don't fail on error
    if (apiKey) {
      const deregisterRes = await fetch(
        `${apiBase}/v2/user/${junctionUserId}/garmin`,
        {
          method: 'DELETE',
          headers: {
            'x-vital-api-key': apiKey,
            'Accept': 'application/json',
          },
        },
      );

      if (!deregisterRes.ok) {
        const errBody = await deregisterRes.text().catch(() => '');
        console.error(`Junction deregister failed (${deregisterRes.status}):`, errBody);
        // Continue — mark as disconnected in our DB regardless
      }
    }

    // Mark connection as disconnected
    const { error: updateErr } = await supabase
      .from('junction_poc_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateErr) return json({ error: 'db_error' }, 500);

    return json({ disconnected: true });
  } catch (err) {
    console.error('junction-disconnect unexpected error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});

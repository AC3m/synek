import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AuthError, extractUserId } from '../_shared/auth.ts';
import { cleanupStravaData, CleanupError } from '../_shared/strava-cleanup.ts';

const STRAVA_DEAUTHORIZE_URL = 'https://www.strava.com/oauth/deauthorize';

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
    const userId = await extractUserId(req);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokenRow, error: tokenError } = await adminClient
      .from('strava_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle();

    if (tokenError) return json({ error: 'db_error' }, 500);

    if (tokenRow?.access_token) {
      try {
        const deauthorizeUrl = new URL(STRAVA_DEAUTHORIZE_URL);
        deauthorizeUrl.searchParams.set('access_token', tokenRow.access_token as string);

        const deauthorizeRes = await fetch(deauthorizeUrl, { method: 'POST' });
        if (!deauthorizeRes.ok && deauthorizeRes.status !== 401) {
          console.error('Strava deauthorization failed:', deauthorizeRes.status);
        }
      } catch (error) {
        console.error('Strava deauthorization failed:', error);
      }
    }

    await cleanupStravaData(adminClient, userId);

    const { error } = await adminClient.from('strava_tokens').delete().eq('user_id', userId);

    if (error) return json({ error: 'db_error' }, 500);

    return json({ disconnected: true });
  } catch (err) {
    if (err instanceof AuthError) return json({ error: 'unauthorized' }, 401);
    if (err instanceof CleanupError) return json({ error: 'db_error' }, 500);
    return json({ error: 'disconnect_failed' }, 500);
  }
});

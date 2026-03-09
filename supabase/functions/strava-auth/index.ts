import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

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
    const { code, userId } = await req.json() as { code: string; userId: string };

    if (!code || !userId) {
      return json({ error: 'missing_params' }, 400);
    }

    const clientId = Deno.env.get('STRAVA_CLIENT_ID');
    const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET');

    const tokenRes = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return json({ error: 'exchange_failed' }, 400);
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: { id: number; firstname: string; lastname: string };
    };

    const athleteName = `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`.trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('strava_tokens').upsert(
      {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        athlete_id: tokenData.athlete.id,
        strava_athlete_name: athleteName,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) return json({ error: 'db_error' }, 500);

    return json({
      connected: true,
      stravaAthleteName: athleteName,
      stravaAthleteId: tokenData.athlete.id,
    });
  } catch {
    return json({ error: 'exchange_failed' }, 500);
  }
});

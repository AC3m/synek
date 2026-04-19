import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }

    const jwt = authHeader.slice(7);
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return json({ error: 'unauthorized' }, 401);
    }
    const userId = userData.user.id;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

    const { data: weekPlans, error: weekPlansError } = await adminClient
      .from('week_plans')
      .select('id')
      .eq('athlete_id', userId);

    if (weekPlansError) return json({ error: 'db_error' }, 500);

    const weekPlanIds = (weekPlans ?? []).map((row) => row.id as string);
    if (weekPlanIds.length > 0) {
      const { error: sessionsError } = await adminClient
        .from('training_sessions')
        .update({
          strava_activity_id: null,
          strava_synced_at: null,
          calories: null,
        })
        .in('week_plan_id', weekPlanIds)
        .not('strava_activity_id', 'is', null);

      if (sessionsError) return json({ error: 'db_error' }, 500);
    }

    const { error: activitiesError } = await adminClient
      .from('strava_activities')
      .delete()
      .eq('user_id', userId);

    if (activitiesError) return json({ error: 'db_error' }, 500);

    const { error } = await adminClient
      .from('strava_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) return json({ error: 'db_error' }, 500);

    return json({ disconnected: true });
  } catch {
    return json({ error: 'disconnect_failed' }, 500);
  }
});

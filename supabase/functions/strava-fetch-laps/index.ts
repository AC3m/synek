import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITY_URL = 'https://www.strava.com/api/v3/activities';

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

// ─── Lap classification ────────────────────────────────────────────────────────

type SegmentType = 'warmup' | 'interval' | 'recovery' | 'cooldown';

interface StravaRawLap {
  lap_index: number;
  name?: string;
  intensity?: 'active' | 'rest';
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  pace_zone?: number;
}

function classifyLaps(rawLaps: StravaRawLap[]): Array<StravaRawLap & { segment_type: SegmentType }> {
  if (rawLaps.length === 0) return [];

  const nameClassified = rawLaps.map((lap) => {
    const nameLower = (lap.name ?? '').toLowerCase();
    if (nameLower.includes('warm') || nameLower.includes('wu')) {
      return { ...lap, segment_type: 'warmup' as SegmentType };
    }
    if (nameLower.includes('cool') || nameLower.includes('cd')) {
      return { ...lap, segment_type: 'cooldown' as SegmentType };
    }
    return { ...lap, segment_type: null as unknown as SegmentType };
  });

  const restIndices = rawLaps
    .map((lap, i) => (lap.intensity === 'rest' ? i : -1))
    .filter((i) => i !== -1);

  if (restIndices.length === 0) {
    return nameClassified.map((lap) => ({
      ...lap,
      segment_type: (lap.segment_type ?? 'interval') as SegmentType,
    }));
  }

  const firstRest = restIndices[0];
  const lastRest = restIndices[restIndices.length - 1];

  return nameClassified.map((lap, i) => {
    if (lap.segment_type !== null) return lap;
    if (lap.intensity === 'rest') return { ...lap, segment_type: 'recovery' as SegmentType };
    if (i < firstRest) return { ...lap, segment_type: 'warmup' as SegmentType };
    if (i > lastRest) return { ...lap, segment_type: 'cooldown' as SegmentType };
    return { ...lap, segment_type: 'interval' as SegmentType };
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }

    const token = authHeader.slice(7);

    // Use the anon client + getClaims for local JWT verification (no network round-trip).
    // This works correctly with ES256 asymmetric tokens issued by this Supabase project.
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: 'unauthorized' }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const { sessionId } = await req.json() as { sessionId?: string };
    if (!sessionId) {
      return json({ error: 'missing_session_id' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: sessionRow, error: sessionErr } = await supabase
      .from('training_sessions')
      .select('id, strava_activity_id, week_plan_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !sessionRow) {
      return json({ error: 'forbidden' }, 403);
    }

    const { data: weekPlan, error: wpErr } = await supabase
      .from('week_plans')
      .select('athlete_id')
      .eq('id', sessionRow.week_plan_id)
      .maybeSingle();

    if (wpErr || !weekPlan) {
      return json({ error: 'forbidden' }, 403);
    }

    const isAthlete = weekPlan.athlete_id === userId;

    if (!isAthlete) {
      const { data: coachRel } = await supabase
        .from('coach_athletes')
        .select('coach_id')
        .eq('coach_id', userId)
        .eq('athlete_id', weekPlan.athlete_id)
        .maybeSingle();

      if (!coachRel) {
        return json({ error: 'forbidden' }, 403);
      }
    }

    const stravaId = sessionRow.strava_activity_id as number | null;
    if (!stravaId) {
      return json({ error: 'no_strava_activity' }, 404);
    }

    const { data: activityRow, error: activityError } = await supabase
      .from('strava_activities')
      .select('is_confirmed')
      .eq('strava_id', stravaId)
      .maybeSingle();

    if (activityError) {
      return json({ error: 'forbidden' }, 403);
    }

    const isConfirmed = activityRow?.is_confirmed === true;
    if (!isAthlete && !isConfirmed) {
      return json({ laps: [] });
    }

    const { data: cachedLaps, error: cacheErr } = await supabase
      .from('strava_laps')
      .select(
        'lap_index, name, intensity, segment_type, distance_meters, elapsed_time_seconds, moving_time_seconds, average_speed, average_heartrate, max_heartrate, average_cadence, pace_zone'
      )
      .eq('strava_activity_id', stravaId)
      .order('lap_index', { ascending: true });

    if (!cacheErr && cachedLaps && cachedLaps.length > 0) {
      return json({ laps: cachedLaps.map(toLapResponse) });
    }

    if (!isAthlete) {
      return json({ laps: [] });
    }

    const { data: tokenRow, error: tokenErr } = await supabase
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', userId)
      .single();

    if (tokenErr || !tokenRow) {
      return json({ error: 'no_strava_activity' }, 404);
    }

    let accessToken = tokenRow.access_token as string;

    if (new Date(tokenRow.expires_at as string).getTime() < Date.now() + 60_000) {
      const refreshRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          refresh_token: tokenRow.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshRes.ok) {
        return json({ error: 'strava_api_error', detail: 'token refresh failed' }, 502);
      }

      const refreshData = await refreshRes.json() as {
        access_token: string;
        refresh_token: string;
        expires_at: number;
      };

      accessToken = refreshData.access_token;
      await supabase
        .from('strava_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
        })
        .eq('user_id', userId);
    }

    const activityRes = await fetch(
      `${STRAVA_ACTIVITY_URL}/${stravaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (activityRes.status === 429) {
      return json({ error: 'strava_rate_limited' }, 429);
    }
    if (!activityRes.ok) {
      const detail = await activityRes.text().catch(() => '');
      return json({ error: 'strava_api_error', detail }, 502);
    }

    const activity = await activityRes.json() as { laps?: StravaRawLap[] };
    const classified = classifyLaps(activity.laps ?? []);

    if (classified.length > 0) {
      await supabase
        .from('strava_laps')
        .upsert(
          classified.map((lap) => ({
            strava_activity_id: stravaId,
            user_id: userId,
            lap_index: lap.lap_index,
            name: lap.name ?? null,
            intensity: lap.intensity ?? null,
            segment_type: lap.segment_type,
            distance_meters: lap.distance ?? null,
            elapsed_time_seconds: lap.elapsed_time ?? null,
            moving_time_seconds: lap.moving_time ?? null,
            average_speed: lap.average_speed ?? null,
            average_heartrate: lap.average_heartrate ?? null,
            max_heartrate: lap.max_heartrate ?? null,
            average_cadence: lap.average_cadence ?? null,
            pace_zone: lap.pace_zone ?? null,
          })),
          { onConflict: 'strava_activity_id,lap_index' }
        );
    }

    return json({
      laps: classified.map((lap) => ({
        lapIndex: lap.lap_index,
        name: lap.name ?? null,
        intensity: lap.intensity ?? null,
        segmentType: lap.segment_type,
        distanceMeters: lap.distance ?? null,
        elapsedTimeSeconds: lap.elapsed_time ?? null,
        movingTimeSeconds: lap.moving_time ?? null,
        averageSpeed: lap.average_speed ?? null,
        averageHeartrate: lap.average_heartrate ?? null,
        maxHeartrate: lap.max_heartrate ?? null,
        averageCadence: lap.average_cadence ?? null,
        paceZone: lap.pace_zone ?? null,
      })),
    });
  } catch {
    return json({ error: 'internal_error' }, 500);
  }
});

function toLapResponse(row: Record<string, unknown>) {
  return {
    lapIndex: row.lap_index,
    name: row.name ?? null,
    intensity: row.intensity ?? null,
    segmentType: row.segment_type,
    distanceMeters: row.distance_meters ?? null,
    elapsedTimeSeconds: row.elapsed_time_seconds ?? null,
    movingTimeSeconds: row.moving_time_seconds ?? null,
    averageSpeed: row.average_speed ?? null,
    averageHeartrate: row.average_heartrate ?? null,
    maxHeartrate: row.max_heartrate ?? null,
    averageCadence: row.average_cadence ?? null,
    paceZone: row.pace_zone ?? null,
  };
}

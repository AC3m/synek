import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';

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

// Strava type → Synek training type
const TYPE_MAP: Record<string, string[]> = {
  Run: ['run'],
  TrailRun: ['run'],
  VirtualRun: ['run'],
  Ride: ['cycling'],
  EBikeRide: ['cycling'],
  EMountainBikeRide: ['cycling'],
  VirtualRide: ['cycling'],
  MountainBikeRide: ['cycling'],
  GravelRide: ['cycling'],
  Swim: ['swimming'],
  WeightTraining: ['strength'],
  Crossfit: ['strength'],
  HighIntensityIntervalTraining: ['strength', 'other'],
  Workout: ['strength', 'mobility', 'other'], // Apple Watch Flexibility/Core syncs as Workout
  Yoga: ['yoga'],
  Pilates: ['pilates'],
  Elliptical: ['elliptical'],
  Walk: ['walk'],
  Hike: ['hike'],
};

function mapType(stravaType: string): string[] {
  return TYPE_MAP[stravaType] ?? ['other'];
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

    const body = await req.json() as { weekStart: string; sessionId?: string };
    const { weekStart, sessionId } = body;
    if (!weekStart) {
      return json({ error: 'invalid_request' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('strava_tokens')
      .select('access_token, refresh_token, expires_at, athlete_id')
      .eq('user_id', userId)
      .single();

    if (tokenErr || !tokenRow) {
      return json({ error: "not_connected" }, 400);
    }

    let accessToken = tokenRow.access_token as string;

    // Refresh if expired
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
        return json({ error: "token_refresh_failed" }, 500);
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

    // Determine week date range
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 7);

    const after = Math.floor(weekStartDate.getTime() / 1000);
    const before = Math.floor(weekEndDate.getTime() / 1000);

    // Fetch activities from Strava
    const activitiesRes = await fetch(
      `${STRAVA_ACTIVITIES_URL}?after=${after}&before=${before}&per_page=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!activitiesRes.ok) {
      return json({ error: "strava_api_error" }, 500);
    }

    const activities = await activitiesRes.json() as Array<{
      id: number;
      name: string;
      type: string;
      start_date: string;
      moving_time: number;
      elapsed_time: number;
      distance: number;
      total_elevation_gain: number;
      average_speed: number;
      max_speed: number;
      average_heartrate?: number;
      max_heartrate?: number;
      average_cadence?: number;
      calories?: number;
      suffer_score?: number;
      workout_type?: number;
    }>;

    // Load week plan + sessions for this user
    const { data: weekPlan } = await supabase
      .from('week_plans')
      .select('id')
      .eq('athlete_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (!weekPlan) {
      return json({ synced: 0, lastSyncedAt: new Date().toISOString() });
    }

    const { data: sessionsData } = await supabase
      .from('training_sessions')
      .select('id, day_of_week, training_type, strava_activity_id')
      .eq('week_plan_id', weekPlan.id);

    const weekSessionIds = (sessionsData ?? []).map((s) => s.id);
    const linkedSessionIds = new Set<string>();

    if (weekSessionIds.length > 0) {
      const { data: linkedRows } = await supabase
        .from('strava_activities')
        .select('training_session_id')
        .in('training_session_id', weekSessionIds);

      for (const row of linkedRows ?? []) {
        const sessionId = row.training_session_id as string | null;
        if (sessionId) linkedSessionIds.add(sessionId);
      }
    }

    // Sync candidates are sessions without a linked strava_activities row.
    // This includes both never-synced sessions and stale/orphaned links where
    // strava_activity_id is set but backing row is missing.
    const unlinkedSessions = (sessionsData ?? []).filter((session) => !linkedSessionIds.has(session.id));

    // When a specific sessionId is provided, narrow the pool to that session only.
    const sessions = sessionId
      ? unlinkedSessions.filter((s) => s.id === sessionId)
      : unlinkedSessions;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let synced = 0;

    // Sort activities so that specific mappings (e.g., WeightTraining -> ['strength'])
    // are processed BEFORE generic fallbacks (e.g., Workout -> ['strength', 'mobility', 'other']).
    // This prevents a generic activity from stealing a session meant for a specific one.
    activities.sort((a, b) => mapType(a.type).length - mapType(b.type).length);

    for (const activity of activities) {
      const synerTypes = mapType(activity.type);
      const activityDate = new Date(activity.start_date);
      const dayIndex = (activityDate.getDay() + 6) % 7; // Mon=0
      const dayName = days[dayIndex];

      // Find matching unsynced session, respecting the priority order in synerTypes array
      let matchIdx = -1;
      for (const targetType of synerTypes) {
        matchIdx = sessions.findIndex(
          (s) => s.day_of_week === dayName && s.training_type === targetType
        );
        if (matchIdx !== -1) break; // Found a match at this priority level
      }

      if (matchIdx === -1) continue;
      const match = sessions[matchIdx];
      // Remove from pool so a second activity of the same type/day matches the next session
      sessions.splice(matchIdx, 1);

      // Round HR floats to integers (Strava returns floats; DB column is INTEGER)
      const avgHr = activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null;
      const maxHr = activity.max_heartrate != null ? Math.round(activity.max_heartrate) : null;

      // Compute pace string (min/km)
      let pace: string | null = null;
      if (activity.average_speed > 0 && synerTypes.some(t => ['run', 'walk', 'hike'].includes(t))) {
        const secPerKm = 1000 / activity.average_speed;
        const paceMin = Math.floor(secPerKm / 60);
        const paceSec = Math.round(secPerKm % 60);
        pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
      }

      // Upsert strava_activities
      const { error: upsertErr } = await supabase
        .from('strava_activities')
        .upsert(
          {
            strava_id: activity.id,
            training_session_id: match.id,
            user_id: userId,
            name: activity.name,
            activity_type: activity.type,
            start_date: activity.start_date,
            moving_time_seconds: activity.moving_time,
            elapsed_time_seconds: activity.elapsed_time,
            distance_meters: activity.distance,
            total_elevation_gain: activity.total_elevation_gain,
            average_speed: activity.average_speed,
            max_speed: activity.max_speed,
            average_heartrate: avgHr,
            max_heartrate: maxHr,
            average_cadence: activity.average_cadence ?? null,
            calories: activity.calories ?? null,
            suffer_score: activity.suffer_score ?? null,
            average_pace_per_km: pace,
            workout_type: activity.workout_type ?? null,
            raw_data: activity,
          },
          { onConflict: 'strava_id' }
        );

      if (upsertErr) {
        console.error(`strava_activities upsert failed for strava_id=${activity.id}:`, JSON.stringify(upsertErr));
        continue;
      }

      // Update training session with actual performance
      const { error: updateErr } = await supabase
        .from('training_sessions')
        .update({
          strava_activity_id: activity.id,
          strava_synced_at: new Date().toISOString(),
          calories: activity.calories ?? null,
        })
        .eq('id', match.id);

      if (updateErr) {
        console.error(`training_sessions update failed for session=${match.id}:`, JSON.stringify(updateErr));
        continue;
      }

      synced++;
    }

    const lastSyncedAt = new Date().toISOString();
    await supabase
      .from('strava_tokens')
      .update({ last_synced_at: lastSyncedAt })
      .eq('user_id', userId);

    return json({ synced, lastSyncedAt });
  } catch {
    return json({ error: "strava_api_error" }, 500);
  }
});

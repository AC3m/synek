import { supabase, isMockMode } from '~/lib/supabase';
import { mockFetchSessionLaps } from '~/lib/mock-data/strava-laps';
import type { StravaLap } from '~/types/strava';

export function toLap(row: Record<string, unknown>): StravaLap {
  return {
    id: row.id as string,
    lapIndex: row.lap_index as number,
    name: (row.name as string | null) ?? null,
    intensity: (row.intensity as 'active' | 'rest' | null) ?? null,
    segmentType: row.segment_type as StravaLap['segmentType'],
    distanceMeters: (row.distance_meters as number | null) ?? null,
    elapsedTimeSeconds: (row.elapsed_time_seconds as number | null) ?? null,
    movingTimeSeconds: (row.moving_time_seconds as number | null) ?? null,
    averageSpeed: (row.average_speed as number | null) ?? null,
    averageHeartrate: (row.average_heartrate as number | null) ?? null,
    maxHeartrate: (row.max_heartrate as number | null) ?? null,
    averageCadence: (row.average_cadence as number | null) ?? null,
    paceZone: (row.pace_zone as number | null) ?? null,
  };
}

export async function fetchSessionLaps(sessionId: string): Promise<StravaLap[]> {
  if (isMockMode) return mockFetchSessionLaps(sessionId);

  const { data, error } = await supabase.functions.invoke<{ laps: Array<Record<string, unknown>> }>(
    'strava-fetch-laps',
    { body: { sessionId } }
  );

  if (error) {
    const msg = (error as { message?: string }).message ?? 'fetch_failed';
    if (msg.includes('429') || msg.toLowerCase().includes('rate')) throw new Error('strava_rate_limited');
    throw new Error(msg);
  }

  // The edge function returns camelCase directly
  return (data?.laps ?? []).map((lap) => ({
    id: '',
    lapIndex: lap.lapIndex as number,
    name: (lap.name as string | null) ?? null,
    intensity: (lap.intensity as 'active' | 'rest' | null) ?? null,
    segmentType: lap.segmentType as StravaLap['segmentType'],
    distanceMeters: (lap.distanceMeters as number | null) ?? null,
    elapsedTimeSeconds: (lap.elapsedTimeSeconds as number | null) ?? null,
    movingTimeSeconds: (lap.movingTimeSeconds as number | null) ?? null,
    averageSpeed: (lap.averageSpeed as number | null) ?? null,
    averageHeartrate: (lap.averageHeartrate as number | null) ?? null,
    maxHeartrate: (lap.maxHeartrate as number | null) ?? null,
    averageCadence: (lap.averageCadence as number | null) ?? null,
    paceZone: (lap.paceZone as number | null) ?? null,
  }));
}

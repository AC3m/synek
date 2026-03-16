// PoC: Junction Garmin integration — remove after evaluation
import { supabase, isMockMode } from '~/lib/supabase';
import {
  getMockJunctionConnection,
  mockCreateJunctionConnection,
  mockDisconnectJunctionConnection,
  getMockJunctionWorkoutForSession,
  getMockJunctionWorkoutsForWeek,
} from '~/lib/mock-data/junction-poc';
import { JUNCTION_SPORT_MAP } from '~/types/junction-poc';
import type { JunctionPocConnection, JunctionPocWorkout } from '~/types/junction-poc';

function toJunctionConnection(row: Record<string, unknown>): JunctionPocConnection {
  return {
    id: row.id as string,
    appUserId: row.app_user_id as string,
    junctionUserId: row.junction_user_id as string,
    connectedAt: row.connected_at as string,
    status: row.status as 'active' | 'disconnected',
    disconnectedAt: (row.disconnected_at as string | null) ?? null,
  };
}

export async function fetchJunctionConnection(
  appUserId: string,
): Promise<JunctionPocConnection | null> {
  if (isMockMode) return getMockJunctionConnection(appUserId);

  const { data, error } = await supabase
    .from('junction_poc_connections')
    .select('id, app_user_id, junction_user_id, connected_at, status, disconnected_at')
    .eq('app_user_id', appUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data ? toJunctionConnection(data) : null;
}

export async function createJunctionConnection(
  appUserId: string,
  junctionUserId: string,
): Promise<JunctionPocConnection> {
  if (isMockMode) return mockCreateJunctionConnection(appUserId, junctionUserId);

  const { data, error } = await supabase
    .from('junction_poc_connections')
    .upsert(
      { app_user_id: appUserId, junction_user_id: junctionUserId, status: 'active', disconnected_at: null },
      { onConflict: 'app_user_id' },
    )
    .select('id, app_user_id, junction_user_id, connected_at, status, disconnected_at')
    .single();

  if (error) throw error;
  return toJunctionConnection(data);
}

function toJunctionWorkout(row: Record<string, unknown>): JunctionPocWorkout {
  return {
    id: row.id as string,
    appUserId: row.app_user_id as string,
    junctionWorkoutId: row.junction_workout_id as string,
    title: (row.title as string | null) ?? null,
    sportSlug: (row.sport_slug as string | null) ?? null,
    calendarDate: row.calendar_date as string,
    movingTimeSeconds: (row.moving_time_seconds as number | null) ?? null,
    distanceMeters: (row.distance_meters as number | null) ?? null,
    calories: (row.calories as number | null) ?? null,
    averageHr: (row.average_hr as number | null) ?? null,
    maxHr: (row.max_hr as number | null) ?? null,
    averageSpeed: (row.average_speed as number | null) ?? null,
  };
}

export async function fetchJunctionWorkoutForSession(
  appUserId: string,
  calendarDate: string,
  trainingType: string,
): Promise<JunctionPocWorkout | null> {
  if (isMockMode) return getMockJunctionWorkoutForSession(appUserId, calendarDate, trainingType);

  // Find sport slugs that map to the requested training type
  const matchingSlugs = Object.entries(JUNCTION_SPORT_MAP)
    .filter(([, type]) => type === trainingType)
    .map(([slug]) => slug);

  if (matchingSlugs.length === 0) return null;

  const { data, error } = await supabase
    .from('junction_poc_workouts')
    .select(
      'id, app_user_id, junction_workout_id, title, sport_slug, calendar_date, moving_time_seconds, distance_meters, calories, average_hr, max_hr, average_speed',
    )
    .eq('app_user_id', appUserId)
    .eq('calendar_date', calendarDate)
    .in('sport_slug', matchingSlugs)
    .maybeSingle();

  if (error) throw error;
  return data ? toJunctionWorkout(data) : null;
}

// PoC: Junction Garmin integration — remove after evaluation
export async function fetchJunctionWorkoutsForWeek(
  appUserId: string,
  weekStart: string,
  weekEnd: string,
): Promise<JunctionPocWorkout[]> {
  if (isMockMode) return getMockJunctionWorkoutsForWeek(appUserId, weekStart, weekEnd);

  const { data, error } = await supabase
    .from('junction_poc_workouts')
    .select(
      'id, app_user_id, junction_workout_id, title, sport_slug, calendar_date, moving_time_seconds, distance_meters, calories, average_hr, max_hr, average_speed',
    )
    .eq('app_user_id', appUserId)
    .gte('calendar_date', weekStart)
    .lte('calendar_date', weekEnd);

  if (error) throw error;
  return (data ?? []).map(toJunctionWorkout);
}

// ── Connection queries (existing) ────────────────────────────────────────────

export async function disconnectJunctionConnection(appUserId: string): Promise<void> {
  if (isMockMode) {
    mockDisconnectJunctionConnection(appUserId);
    return;
  }

  const { error } = await supabase
    .from('junction_poc_connections')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('app_user_id', appUserId)
    .eq('status', 'active');

  if (error) throw error;
}

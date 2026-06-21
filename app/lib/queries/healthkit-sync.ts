import { supabase, isMockMode } from '~/lib/supabase';
import type {
  HealthKitSyncResult,
  HealthKitSyncStatus,
  HealthKitWorkoutPayload,
} from '~/types/healthkit';
import { trainingTypeMatchesHk } from '~/lib/utils/healthkit-activity-map';
import type { TrainingType } from '~/types/training';

// ============================================================
// Mock state
// ============================================================

let mockStatus: HealthKitSyncStatus = {
  connected: false,
  lastSyncAt: null,
  lastError: null,
  workoutsSynced: 0,
};

// ============================================================
// Status
// ============================================================

export async function mockGetHealthKitSyncStatus(): Promise<HealthKitSyncStatus> {
  await new Promise((r) => setTimeout(r, 100));
  return mockStatus;
}

export async function getHealthKitSyncStatus(userId: string): Promise<HealthKitSyncStatus> {
  if (isMockMode) return mockGetHealthKitSyncStatus();

  const { data, error } = await supabase
    .from('healthkit_sync_status')
    .select('last_sync_at, last_error, workouts_synced')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { connected: false, lastSyncAt: null, lastError: null, workoutsSynced: 0 };
  }

  return {
    connected: true,
    lastSyncAt: data.last_sync_at as string | null,
    lastError: data.last_error as string | null,
    workoutsSynced: (data.workouts_synced as number | null) ?? 0,
  };
}

// ============================================================
// Sync: upsert HK workouts + match to planned sessions
// ============================================================

interface SyncInput {
  userId: string;
  workouts: HealthKitWorkoutPayload[];
}

export async function mockSyncHealthKitWorkouts(input: SyncInput): Promise<HealthKitSyncResult> {
  await new Promise((r) => setTimeout(r, 400));
  const now = new Date().toISOString();
  mockStatus = {
    connected: true,
    lastSyncAt: now,
    lastError: null,
    workoutsSynced: mockStatus.workoutsSynced + input.workouts.length,
  };
  return { upserted: input.workouts.length, matched: 0, lastSyncAt: now };
}

export async function syncHealthKitWorkouts(input: SyncInput): Promise<HealthKitSyncResult> {
  if (isMockMode) return mockSyncHealthKitWorkouts(input);

  const { userId, workouts } = input;
  const now = new Date().toISOString();

  if (workouts.length === 0) {
    await upsertSyncStatus(userId, now, null, 0);
    return { upserted: 0, matched: 0, lastSyncAt: now };
  }

  const rows = workouts.map((w) => ({
    hk_uuid: w.hkUuid,
    user_id: userId,
    activity_type: w.activityId,
    hk_activity_type: w.hkActivityType,
    source_name: w.sourceName,
    source_bundle_id: w.sourceBundleId,
    start_date: w.startDate,
    end_date: w.endDate,
    duration_seconds: w.durationSeconds,
    distance_meters: w.distanceMeters,
    active_energy_kcal: w.activeEnergyKcal,
    average_heartrate: w.averageHeartrate,
    max_heartrate: w.maxHeartrate,
    raw_data: w.raw,
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from('healthkit_workouts')
    .upsert(rows, { onConflict: 'hk_uuid' })
    .select('id, hk_uuid, activity_type, start_date, training_session_id');

  if (upsertError) {
    await upsertSyncStatus(userId, now, upsertError.message, 0);
    throw upsertError;
  }

  const unmatched = (upserted ?? []).filter((row) => row.training_session_id === null);
  const matched = await matchWorkoutsToSessions(userId, unmatched);

  await upsertSyncStatus(userId, now, null, rows.length);

  return { upserted: rows.length, matched, lastSyncAt: now };
}

// ============================================================
// Internal: match HK workouts to planned training_sessions
// ============================================================

interface UnmatchedRow {
  id: string;
  hk_uuid: string;
  activity_type: string | null;
  start_date: string | null;
  training_session_id: string | null;
}

/**
 * For each unmatched HK workout, find a same-day planned session of compatible training_type
 * for this athlete and link them (one-to-one; first compatible wins).
 */
async function matchWorkoutsToSessions(userId: string, unmatched: UnmatchedRow[]): Promise<number> {
  if (unmatched.length === 0) return 0;

  const dates = Array.from(
    new Set(
      unmatched.map((w) => w.start_date?.slice(0, 10)).filter((d): d is string => d !== undefined),
    ),
  );
  if (dates.length === 0) return 0;

  const weekStarts = Array.from(new Set(dates.map((d) => weekStartFor(d))));

  // Sessions for this athlete in the relevant weeks, not yet linked to a HK workout.
  const { data: sessions, error: sessionsError } = await supabase
    .from('training_sessions')
    .select('id, training_type, day_of_week, week_plans!inner(athlete_id, week_start)')
    .is('healthkit_workout_id', null)
    .in('week_plans.week_start', weekStarts)
    .eq('week_plans.athlete_id', userId);

  if (sessionsError) throw sessionsError;

  type SessionRow = { id: string; training_type: TrainingType; date: string };
  const sessionsByDate = new Map<string, SessionRow[]>();
  for (const s of sessions ?? []) {
    const wp = s.week_plans as { week_start: string } | { week_start: string }[] | null;
    const weekStart = Array.isArray(wp) ? wp[0]?.week_start : wp?.week_start;
    if (!weekStart) continue;
    const date = addDaysIso(weekStart, dayOffset(s.day_of_week as string));
    const arr = sessionsByDate.get(date) ?? [];
    arr.push({
      id: s.id as string,
      training_type: s.training_type as TrainingType,
      date,
    });
    sessionsByDate.set(date, arr);
  }

  let matched = 0;
  for (const workout of unmatched) {
    const date = workout.start_date?.slice(0, 10);
    if (!date || !workout.activity_type) continue;

    const candidates = sessionsByDate.get(date) ?? [];
    const session = candidates.find((s) =>
      trainingTypeMatchesHk(s.training_type, workout.activity_type!),
    );
    if (!session) continue;

    const { error: linkError } = await supabase
      .from('training_sessions')
      .update({ healthkit_workout_id: workout.id, healthkit_synced_at: new Date().toISOString() })
      .eq('id', session.id);
    if (linkError) continue;

    const { error: backlinkError } = await supabase
      .from('healthkit_workouts')
      .update({ training_session_id: session.id })
      .eq('id', workout.id);
    if (backlinkError) continue;

    // Consume this session so we don't double-match in this batch.
    sessionsByDate.set(
      date,
      candidates.filter((s) => s.id !== session.id),
    );
    matched += 1;
  }

  return matched;
}

/** ISO weekday-aware Monday-of-week, used to filter week_plans.week_start. */
function weekStartFor(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (dow + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

const DAY_OFFSETS: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function dayOffset(day: string): number {
  return DAY_OFFSETS[day] ?? 0;
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function upsertSyncStatus(
  userId: string,
  syncedAt: string,
  error: string | null,
  workoutsSynced: number,
): Promise<void> {
  const { error: upsertError } = await supabase.from('healthkit_sync_status').upsert(
    {
      user_id: userId,
      last_sync_at: syncedAt,
      last_error: error,
      workouts_synced: workoutsSynced,
    },
    { onConflict: 'user_id' },
  );
  if (upsertError) throw upsertError;
}

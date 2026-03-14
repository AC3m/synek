import { supabase, isMockMode } from '~/lib/supabase';
import {
  mockFetchSessionsByWeekPlan,
  mockCreateSession,
  mockUpdateSession,
  mockDeleteSession,
  mockUpdateAthleteSession,
  mockConfirmStravaSession,
  mockBulkConfirmStravaSessions,
} from '~/lib/mock-data';
import type {
  TrainingSession,
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TypeSpecificData,
} from '~/types/training';

export function toSession(row: Record<string, unknown>): TrainingSession {
  return {
    id: row.id as string,
    weekPlanId: row.week_plan_id as string,
    dayOfWeek: row.day_of_week as TrainingSession['dayOfWeek'],
    sortOrder: row.sort_order as number,
    trainingType: row.training_type as TrainingSession['trainingType'],
    description: row.description as string | null,
    coachComments: row.coach_comments as string | null,
    plannedDurationMinutes: row.planned_duration_minutes as number | null,
    plannedDistanceKm: row.planned_distance_km as number | null,
    typeSpecificData: (row.type_specific_data ?? {
      type: row.training_type,
    }) as TypeSpecificData,
    isCompleted: row.is_completed as boolean,
    completedAt: row.completed_at as string | null,
    actualDurationMinutes: row.actual_duration_minutes as number | null,
    actualDistanceKm: row.actual_distance_km as number | null,
    actualPace: row.actual_pace as string | null,
    avgHeartRate: row.avg_heart_rate as number | null,
    maxHeartRate: row.max_heart_rate as number | null,
    rpe: row.rpe as number | null,
    coachPostFeedback: row.coach_post_feedback as string | null,
    athleteNotes: row.trainee_notes as string | null,
    stravaActivityId: row.strava_activity_id as number | null,
    stravaSyncedAt: row.strava_synced_at as string | null,
    isStravaConfirmed: Boolean(row.is_strava_confirmed ?? false),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function confirmStravaSession(sessionId: string): Promise<void> {
  if (isMockMode) return mockConfirmStravaSession(sessionId);

  const { error } = await supabase.rpc('confirm_strava_session', {
    p_session_id: sessionId,
  });

  if (error) throw error;
}

export async function bulkConfirmStravaSessions(weekPlanId: string): Promise<void> {
  if (isMockMode) return mockBulkConfirmStravaSessions(weekPlanId);
  
  const { error } = await supabase
    .rpc('confirm_all_strava_sessions_for_week', { p_week_plan_id: weekPlanId });

  if (error) throw error;
}

export async function fetchSessionsByWeekPlan(
  weekPlanId: string
): Promise<TrainingSession[]> {
  if (isMockMode) return mockFetchSessionsByWeekPlan(weekPlanId);
  const { data, error } = await supabase
    .from('secure_training_sessions')
    .select('*')
    .eq('week_plan_id', weekPlanId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toSession);
}

export async function createSession(
  input: CreateSessionInput
): Promise<TrainingSession> {
  if (isMockMode) return mockCreateSession(input);
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      week_plan_id: input.weekPlanId,
      day_of_week: input.dayOfWeek,
      training_type: input.trainingType,
      description: input.description ?? null,
      coach_comments: input.coachComments ?? null,
      planned_duration_minutes: input.plannedDurationMinutes ?? null,
      planned_distance_km: input.plannedDistanceKm ?? null,
      type_specific_data: input.typeSpecificData ?? { type: input.trainingType },
      sort_order: input.sortOrder ?? 0,
      actual_duration_minutes: input.actualDurationMinutes ?? null,
      actual_distance_km: input.actualDistanceKm ?? null,
      actual_pace: input.actualPace ?? null,
      avg_heart_rate: input.avgHeartRate ?? null,
      max_heart_rate: input.maxHeartRate ?? null,
      rpe: input.rpe ?? null,
      coach_post_feedback: input.coachPostFeedback ?? null,
      is_completed: input.isCompleted ?? false,
      completed_at: input.completedAt ?? null,
      trainee_notes: input.athleteNotes ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}

export async function updateSession(
  input: UpdateSessionInput
): Promise<TrainingSession> {
  if (isMockMode) return mockUpdateSession(input);
  const updates: Record<string, unknown> = {};
  if (input.trainingType !== undefined)
    updates.training_type = input.trainingType;
  if (input.description !== undefined) updates.description = input.description;
  if (input.coachComments !== undefined)
    updates.coach_comments = input.coachComments;
  if (input.plannedDurationMinutes !== undefined)
    updates.planned_duration_minutes = input.plannedDurationMinutes;
  if (input.plannedDistanceKm !== undefined)
    updates.planned_distance_km = input.plannedDistanceKm;
  if (input.typeSpecificData !== undefined)
    updates.type_specific_data = input.typeSpecificData;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
  if (input.actualDurationMinutes !== undefined)
    updates.actual_duration_minutes = input.actualDurationMinutes;
  if (input.actualDistanceKm !== undefined)
    updates.actual_distance_km = input.actualDistanceKm;
  if (input.actualPace !== undefined) updates.actual_pace = input.actualPace;
  if (input.avgHeartRate !== undefined)
    updates.avg_heart_rate = input.avgHeartRate;
  if (input.maxHeartRate !== undefined)
    updates.max_heart_rate = input.maxHeartRate;
  if (input.rpe !== undefined) updates.rpe = input.rpe;
  if (input.coachPostFeedback !== undefined)
    updates.coach_post_feedback = input.coachPostFeedback;

  const { data, error } = await supabase
    .from('training_sessions')
    .update(updates)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isMockMode) return mockDeleteSession(sessionId);
  const { error } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) throw error;
}

export async function updateAthleteSession(
  input: AthleteSessionUpdate
): Promise<TrainingSession> {
  if (isMockMode) return mockUpdateAthleteSession(input);
  const updates: Record<string, unknown> = {};
  if (input.isCompleted !== undefined) {
    updates.is_completed = input.isCompleted;
    updates.completed_at = input.isCompleted ? new Date().toISOString() : null;
  }
  if (input.athleteNotes !== undefined)
    updates.trainee_notes = input.athleteNotes;
  if (input.actualDurationMinutes !== undefined)
    updates.actual_duration_minutes = input.actualDurationMinutes;
  if (input.actualDistanceKm !== undefined)
    updates.actual_distance_km = input.actualDistanceKm;
  if (input.actualPace !== undefined)
    updates.actual_pace = input.actualPace;
  if (input.avgHeartRate !== undefined)
    updates.avg_heart_rate = input.avgHeartRate;
  if (input.maxHeartRate !== undefined)
    updates.max_heart_rate = input.maxHeartRate;
  if (input.rpe !== undefined)
    updates.rpe = input.rpe;

  const { data, error } = await supabase
    .from('training_sessions')
    .update(updates)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}

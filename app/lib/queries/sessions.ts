import { supabase, isMockMode } from '~/lib/supabase';
import {
  mockFetchSessionByGoalId,
  mockFetchSessionsByWeekPlan,
  mockCreateSession,
  mockUpdateSession,
  mockDeleteSession,
  mockUpdateAthleteSession,
  mockConfirmStravaSession,
  mockBulkConfirmStravaSessions,
  mockCopyWeekSessions,
  mockCopyDaySessions,
} from '~/lib/mock-data';
import type {
  TrainingSession,
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TypeSpecificData,
  CopyWeekInput,
  CopyDayInput,
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
    goalId: (row.goal_id as string | null) ?? null,
    resultDistanceKm: row.result_distance_km != null ? Number(row.result_distance_km) : null,
    resultTimeSeconds: row.result_time_seconds != null ? (row.result_time_seconds as number) : null,
    resultPace: (row.result_pace as string | null) ?? null,
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

  const { error } = await supabase.rpc('confirm_all_strava_sessions_for_week', {
    p_week_plan_id: weekPlanId,
  });

  if (error) throw error;
}

export async function fetchSessionByGoalId(goalId: string): Promise<TrainingSession | null> {
  if (isMockMode) return mockFetchSessionByGoalId(goalId);
  const { data, error } = await supabase
    .from('training_sessions')
    .select(
      'id, week_plan_id, day_of_week, sort_order, training_type, description, coach_comments, planned_duration_minutes, planned_distance_km, type_specific_data, is_completed, completed_at, actual_duration_minutes, actual_distance_km, actual_pace, avg_heart_rate, max_heart_rate, rpe, coach_post_feedback, trainee_notes, strava_activity_id, strava_synced_at, goal_id, result_distance_km, result_time_seconds, result_pace, is_strava_confirmed, created_at, updated_at',
    )
    .eq('goal_id', goalId)
    .maybeSingle();

  if (error) throw error;
  return data ? toSession(data as Record<string, unknown>) : null;
}

export async function fetchSessionsByWeekPlan(weekPlanId: string): Promise<TrainingSession[]> {
  if (isMockMode) return mockFetchSessionsByWeekPlan(weekPlanId);
  const { data, error } = await supabase
    .from('secure_training_sessions')
    .select('*')
    .eq('week_plan_id', weekPlanId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toSession);
}

export async function createSession(input: CreateSessionInput): Promise<TrainingSession> {
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
      goal_id: input.goalId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}

export async function updateSession(input: UpdateSessionInput): Promise<TrainingSession> {
  if (isMockMode) return mockUpdateSession(input);
  const updates: Record<string, unknown> = {};
  if (input.trainingType !== undefined) updates.training_type = input.trainingType;
  if (input.dayOfWeek !== undefined) updates.day_of_week = input.dayOfWeek;
  if (input.description !== undefined) updates.description = input.description;
  if (input.coachComments !== undefined) updates.coach_comments = input.coachComments;
  if (input.plannedDurationMinutes !== undefined)
    updates.planned_duration_minutes = input.plannedDurationMinutes;
  if (input.plannedDistanceKm !== undefined) updates.planned_distance_km = input.plannedDistanceKm;
  if (input.typeSpecificData !== undefined) updates.type_specific_data = input.typeSpecificData;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;
  if (input.actualDurationMinutes !== undefined)
    updates.actual_duration_minutes = input.actualDurationMinutes;
  if (input.actualDistanceKm !== undefined) updates.actual_distance_km = input.actualDistanceKm;
  if (input.actualPace !== undefined) updates.actual_pace = input.actualPace;
  if (input.avgHeartRate !== undefined) updates.avg_heart_rate = input.avgHeartRate;
  if (input.maxHeartRate !== undefined) updates.max_heart_rate = input.maxHeartRate;
  if (input.rpe !== undefined) updates.rpe = input.rpe;
  if (input.coachPostFeedback !== undefined) updates.coach_post_feedback = input.coachPostFeedback;

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
  const { error } = await supabase.from('training_sessions').delete().eq('id', sessionId);

  if (error) throw error;
}

export async function copyWeekSessions(input: CopyWeekInput): Promise<number> {
  if (isMockMode) return mockCopyWeekSessions(input);
  const { data, error } = await supabase.rpc('copy_week_sessions', {
    p_source_week_plan_id: input.sourceWeekPlanId,
    p_target_week_plan_id: input.targetWeekPlanId,
  });
  if (error) throw error;
  return data as number;
}

export async function copyDaySessions(input: CopyDayInput): Promise<number> {
  if (isMockMode) return mockCopyDaySessions(input);
  const { data, error } = await supabase.rpc('copy_day_sessions', {
    p_source_week_plan_id: input.sourceWeekPlanId,
    p_source_day: input.sourceDay,
    p_target_week_plan_id: input.targetWeekPlanId,
    p_target_day: input.targetDay,
  });
  if (error) throw error;
  return data as number;
}

export async function updateAthleteSession(input: AthleteSessionUpdate): Promise<TrainingSession> {
  if (isMockMode) return mockUpdateAthleteSession(input);
  const updates: Record<string, unknown> = {};
  if (input.isCompleted !== undefined) {
    updates.is_completed = input.isCompleted;
    updates.completed_at = input.isCompleted ? new Date().toISOString() : null;
  }
  if (input.athleteNotes !== undefined) updates.trainee_notes = input.athleteNotes;
  if (input.actualDurationMinutes !== undefined)
    updates.actual_duration_minutes = input.actualDurationMinutes;
  if (input.actualDistanceKm !== undefined) updates.actual_distance_km = input.actualDistanceKm;
  if (input.actualPace !== undefined) updates.actual_pace = input.actualPace;
  if (input.avgHeartRate !== undefined) updates.avg_heart_rate = input.avgHeartRate;
  if (input.maxHeartRate !== undefined) updates.max_heart_rate = input.maxHeartRate;
  if (input.rpe !== undefined) updates.rpe = input.rpe;

  const { data, error } = await supabase
    .from('training_sessions')
    .update(updates)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;
  return toSession(data);
}

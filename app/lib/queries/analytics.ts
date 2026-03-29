import { supabase, isMockMode } from '~/lib/supabase';
import type {
  AnalyticsBucket,
  AnalyticsParams,
  AnalyticsResponse,
  CompetitionMilestone,
  AchievementStatus,
} from '~/types/training';
import { mockGetAnalytics } from '~/lib/mock-data/analytics';

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

export function toAnalyticsBucket(row: Record<string, unknown>): AnalyticsBucket {
  return {
    label: row.label as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    totalSessions: (row.total_sessions as number) ?? 0,
    completedSessions: (row.completed_sessions as number) ?? 0,
    totalDistanceKm: (row.total_distance_km as number) ?? 0,
    totalDurationMinutes: (row.total_duration_minutes as number) ?? 0,
    completionRate: (row.completion_rate as number) ?? 0,
  };
}

function toCompetitionMilestone(row: Record<string, unknown>): CompetitionMilestone {
  return {
    goalId: row.goal_id as string,
    goalName: row.goal_name as string,
    discipline: row.discipline as CompetitionMilestone['discipline'],
    competitionDate: row.competition_date as string,
    goalDistanceKm: (row.goal_distance_km as number | null) ?? null,
    goalTimeSeconds: (row.goal_time_seconds as number | null) ?? null,
    resultDistanceKm: (row.result_distance_km as number | null) ?? null,
    resultTimeSeconds: (row.result_time_seconds as number | null) ?? null,
    achievementStatus: (row.achievement_status as AchievementStatus) ?? 'pending',
  };
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

export async function getAnalytics(params: AnalyticsParams): Promise<AnalyticsResponse> {
  if (isMockMode) return mockGetAnalytics(params);

  // Real implementation: call a Supabase RPC that aggregates sessions by period
  const { data, error } = await supabase.rpc('get_analytics_summary', {
    p_athlete_id: params.athleteId,
    p_period: params.period,
    p_goal_id: params.goalId ?? null,
    p_training_type: params.trainingType ?? null,
  });

  if (error) throw new Error(error.message);

  const result = data as {
    buckets: Record<string, unknown>[];
    competitions: Record<string, unknown>[];
    totals: Record<string, unknown>;
  } | null;

  const buckets = result?.buckets ?? [];
  const competitions = result?.competitions ?? [];
  const totals = result?.totals ?? {};

  return {
    buckets: buckets.map(toAnalyticsBucket),
    competitions: competitions.map(toCompetitionMilestone),
    totals: {
      totalSessions: (totals.totalSessions as number) ?? 0,
      completedSessions: (totals.completedSessions as number) ?? 0,
      totalDistanceKm: (totals.totalDistanceKm as number) ?? 0,
      totalDurationMinutes: (totals.totalDurationMinutes as number) ?? 0,
      overallCompletionRate: (totals.overallCompletionRate as number) ?? 0,
    },
  };
}

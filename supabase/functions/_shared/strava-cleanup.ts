import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export class CleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CleanupError';
  }
}

/**
 * Removes all Strava-related data for a user:
 * 1. Clears Strava references from training sessions
 * 2. Deletes strava_activities rows
 *
 * Does NOT delete strava_tokens — callers handle that separately
 * because disconnect also deauthorizes via the Strava API first.
 */
// deno-lint-ignore no-explicit-any
export async function cleanupStravaData(
  adminClient: SupabaseClient<any>,
  userId: string,
): Promise<void> {
  const { data: weekPlans, error: weekPlansError } = await adminClient
    .from('week_plans')
    .select('id')
    .eq('athlete_id', userId);

  if (weekPlansError) throw new CleanupError('week plan lookup failed');

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

    if (sessionsError) throw new CleanupError('training session cleanup failed');
  }

  const { error: activitiesError } = await adminClient
    .from('strava_activities')
    .delete()
    .eq('user_id', userId);

  if (activitiesError) throw new CleanupError('activities deletion failed');
}

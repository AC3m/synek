import { computePreviousWeekIds, weekIdToMonday } from '~/lib/utils/date';
import { useWeekPlan } from '~/lib/hooks/useWeekPlan';
import { useSessions } from '~/lib/hooks/useSessions';
import type { HistoryWeek } from '~/types/training';

/**
 * Returns the `count` most recent previous weeks relative to `currentWeekId`,
 * most-recent first. Each entry includes the weekPlan (or null) and sessions.
 *
 * Uses existing useWeekPlan + useSessions hooks; all queries run in parallel
 * and are cached by React Query.
 */
export function useWeekHistory(
  currentWeekId: string,
  count = 4,
): (HistoryWeek & { isLoading: boolean })[] {
  const weekIds = computePreviousWeekIds(currentWeekId, count);

  // Unconditionally call hooks for all history slots (fixed count — Rules of Hooks safe).
  // We call exactly `count` hooks; callers must not change `count` between renders.
  const slot0 = useSingleHistoryWeek(weekIds[0]);
  const slot1 = useSingleHistoryWeek(weekIds[1]);
  const slot2 = useSingleHistoryWeek(weekIds[2]);
  const slot3 = useSingleHistoryWeek(weekIds[3]);

  const slots = [slot0, slot1, slot2, slot3];
  return slots.slice(0, count);
}

function useSingleHistoryWeek(weekId: string | undefined): HistoryWeek & { isLoading: boolean } {
  const weekStart = weekId ? weekIdToMonday(weekId) : '';
  const weekPlanQuery = useWeekPlan(weekStart);
  const sessionsQuery = useSessions(weekPlanQuery.data?.id);

  if (!weekId) {
    return { weekId: '', weekPlan: null, sessions: [], isLoading: false };
  }

  // "done" once the query has settled (success or error), not just stopped fetching
  const weekPlanDone = weekPlanQuery.isSuccess || weekPlanQuery.isError;
  const sessionsDone = !weekPlanQuery.data || sessionsQuery.isSuccess || sessionsQuery.isError;
  const isLoading = !weekPlanDone || !sessionsDone;

  return {
    weekId,
    weekPlan: weekPlanQuery.data ?? null,
    sessions: sessionsQuery.data ?? [],
    isLoading,
  };
}

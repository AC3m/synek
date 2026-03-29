import { addDays, parseISO, getISODay, format } from 'date-fns';
import type { Goal, TrainingSession, AchievementStatus } from '~/types/training';

type SessionResult = Pick<TrainingSession, 'resultDistanceKm' | 'resultTimeSeconds'>;

/**
 * Determines whether the competition goal was achieved, missed, or is still pending.
 * Priority: distance check first, then time check. If no target set on the goal, returns pending.
 */
export function computeGoalAchievement(goal: Goal, session: SessionResult): AchievementStatus {
  const hasResult = session.resultDistanceKm != null || session.resultTimeSeconds != null;

  if (!hasResult) return 'pending';

  // Distance-based achievement
  if (goal.goalDistanceKm != null && session.resultDistanceKm != null) {
    return session.resultDistanceKm >= goal.goalDistanceKm ? 'achieved' : 'missed';
  }

  // Time-based achievement
  if (goal.goalTimeSeconds != null && session.resultTimeSeconds != null) {
    return session.resultTimeSeconds <= goal.goalTimeSeconds ? 'achieved' : 'missed';
  }

  // Has result but no targets to compare against
  return 'pending';
}

/**
 * Returns the preparation window date range for a goal.
 * start: Monday of the week that is `preparationWeeks` before the competition week.
 * end: the competition date itself.
 */
export function getPrepWeekRange(goal: Goal): { start: string; end: string } {
  if (goal.preparationWeeks === 0) {
    return { start: goal.competitionDate, end: goal.competitionDate };
  }

  const competitionDay = parseISO(goal.competitionDate);
  // Go back preparationWeeks * 7 days from competition date
  const rawStart = addDays(competitionDay, -(goal.preparationWeeks * 7));
  // Align to Monday: ISO day 1 = Monday, getISODay returns 1–7
  const dow = getISODay(rawStart); // 1=Mon, 7=Sun
  const monday = addDays(rawStart, -(dow - 1));
  return {
    start: format(monday, 'yyyy-MM-dd'),
    end: goal.competitionDate,
  };
}

/**
 * Returns the Monday date string of the competition week for a goal.
 */
function getCompetitionMonday(goal: Goal): string {
  const endDate = parseISO(goal.competitionDate);
  const competitionDow = getISODay(endDate);
  const competitionMonday = addDays(endDate, -(competitionDow - 1));
  return format(competitionMonday, 'yyyy-MM-dd');
}

/**
 * Returns true if the given weekStart (Monday date string) falls within the
 * preparation window for the goal, EXCLUDING the competition week itself.
 * Use isCompetitionWeek to test the competition week separately.
 */
export function isWeekInPrepWindow(weekStart: string, goal: Goal): boolean {
  // No prep weeks means no prep window at all.
  if (goal.preparationWeeks === 0) return false;

  const competitionMondayStr = getCompetitionMonday(goal);
  const { start } = getPrepWeekRange(goal);
  const weekDate = parseISO(weekStart);
  const startDate = parseISO(start);

  return weekDate >= startDate && weekStart < competitionMondayStr;
}

/**
 * Returns true if the given weekStart is the competition week for this goal.
 */
export function isCompetitionWeek(weekStart: string, goal: Goal): boolean {
  return weekStart === getCompetitionMonday(goal);
}

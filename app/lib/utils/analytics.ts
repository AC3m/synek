import type {
  TrainingSession,
  TrainingType,
  SportBreakdownEntry,
  CompetitionSummary,
} from '~/types/training';

interface SportBreakdownResult {
  byType: Partial<Record<TrainingType, SportBreakdownEntry>>;
  competitionSessions: CompetitionSummary[];
}

/**
 * Groups a list of sessions into per-sport stats and a competition sessions list.
 * Competition sessions (goalId IS NOT NULL) are excluded from byType aggregation.
 * Achievement status is 'pending' when computed from session data alone (no goal targets available).
 */
export function computeSportBreakdown(sessions: TrainingSession[]): SportBreakdownResult {
  const byType: Partial<Record<TrainingType, SportBreakdownEntry>> = {};
  const competitionSessions: CompetitionSummary[] = [];

  for (const session of sessions) {
    if (session.goalId) {
      // Competition session — collect separately
      competitionSessions.push({
        sessionId: session.id,
        goalId: session.goalId,
        goalName: '', // goal name not available here — caller enriches if needed
        discipline: session.trainingType,
        goalDistanceKm: null,
        resultDistanceKm: session.resultDistanceKm ?? null,
        resultTimeSeconds: session.resultTimeSeconds ?? null,
        actualDistanceKm: session.actualDistanceKm ?? null,
        actualDurationMinutes: session.actualDurationMinutes ?? null,
        achievementStatus: 'pending', // cannot determine without goal targets
      });
      continue;
    }

    // Regular training session — aggregate into byType
    const type = session.trainingType;
    const existing = byType[type];

    const actualDistance = session.actualDistanceKm ?? null;
    const durationMinutes = session.actualDurationMinutes ?? session.plannedDurationMinutes ?? 0;

    const completed = session.isCompleted ? 1 : 0;
    const sessionCalories = session.isCompleted ? (session.calories ?? 0) : 0;

    if (!existing) {
      byType[type] = {
        sessionCount: 1,
        completedSessionCount: completed,
        plannedDistanceKm: session.plannedDistanceKm ?? 0,
        actualDistanceKm: actualDistance ?? 0,
        totalDurationMinutes: durationMinutes,
        totalCalories: sessionCalories,
      };
    } else {
      byType[type] = {
        sessionCount: existing.sessionCount + 1,
        completedSessionCount: existing.completedSessionCount + completed,
        plannedDistanceKm: existing.plannedDistanceKm + (session.plannedDistanceKm ?? 0),
        actualDistanceKm: existing.actualDistanceKm + (actualDistance ?? 0),
        totalDurationMinutes: existing.totalDurationMinutes + durationMinutes,
        totalCalories: existing.totalCalories + sessionCalories,
      };
    }
  }

  return { byType, competitionSessions };
}

import type { TrainingSession, CreateSessionInput, DayOfWeek } from '~/types/training';

/**
 * Extracts only planned fields from a TrainingSession to build a CreateSessionInput
 * for copying. Actual performance, athlete notes, Strava, and coach feedback fields
 * are intentionally excluded.
 */
export function buildCopySessionInput(
  session: TrainingSession,
  targetWeekPlanId: string,
  targetDay: DayOfWeek
): CreateSessionInput {
  return {
    weekPlanId: targetWeekPlanId,
    dayOfWeek: targetDay,
    trainingType: session.trainingType,
    description: session.description ?? undefined,
    coachComments: session.coachComments ?? undefined,
    plannedDurationMinutes: session.plannedDurationMinutes ?? undefined,
    plannedDistanceKm: session.plannedDistanceKm ?? undefined,
    typeSpecificData: session.typeSpecificData,
  };
}

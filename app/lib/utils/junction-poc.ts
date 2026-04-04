// PoC: Junction Garmin integration — remove after evaluation

import { JUNCTION_SPORT_MAP } from '~/types/junction-poc';
import type { JunctionPocWorkout } from '~/types/junction-poc';
import type { TrainingSession } from '~/types/training';
import { getSessionCalendarDate } from '~/lib/utils/date';

/**
 * Augments sessions with Garmin activity data from Junction.
 *
 * Enforces 1:1 assignment: each Garmin workout is matched to at most one
 * session. When multiple sessions share the same day and sport type, the
 * unassigned candidate with the closest planned duration is preferred.
 * Sessions that cannot be matched remain unchanged.
 */
export function augmentSessionsWithGarmin(
  sessions: TrainingSession[],
  garminWorkouts: JunctionPocWorkout[],
  weekStart: string,
): TrainingSession[] {
  if (garminWorkouts.length === 0) return sessions;

  // Index workouts by (calendarDate, trainingType) for O(1) lookup
  type MatchKey = string; // `${calendarDate}__${trainingType}`
  const workoutsByKey = new Map<MatchKey, JunctionPocWorkout[]>();
  for (const w of garminWorkouts) {
    if (w.sportSlug === null) continue;
    const trainingType = JUNCTION_SPORT_MAP[w.sportSlug];
    if (!trainingType) continue;
    const key: MatchKey = `${w.calendarDate}__${trainingType}`;
    const list = workoutsByKey.get(key) ?? [];
    list.push(w);
    workoutsByKey.set(key, list);
  }

  // Enforce 1:1 assignment: each Garmin workout is matched to at most one session.
  // When multiple sessions compete for the same day+type, prefer closest planned duration.
  const matchedWorkoutIds = new Set<string>();

  return sessions.map((session) => {
    // Skip sessions that already have manually logged duration or distance
    if (session.actualDurationMinutes !== null || session.actualDistanceKm !== null) {
      return session;
    }

    const calendarDate = getSessionCalendarDate(weekStart, session.dayOfWeek);
    if (!calendarDate) return session;

    const key: MatchKey = `${calendarDate}__${session.trainingType}`;
    const candidates = workoutsByKey.get(key);
    if (!candidates) return session;

    // Pick the unassigned candidate with the closest duration to the planned duration
    const sessionDuration = session.plannedDurationMinutes ?? 0;
    let bestMatch: JunctionPocWorkout | null = null;
    let bestDiff = Infinity;

    for (const w of candidates) {
      if (matchedWorkoutIds.has(w.id)) continue;
      const workoutDuration = w.movingTimeSeconds !== null ? w.movingTimeSeconds / 60 : 0;
      const diff = Math.abs(workoutDuration - sessionDuration);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = w;
      }
    }

    if (!bestMatch) return session;

    matchedWorkoutIds.add(bestMatch.id);

    return {
      ...session,
      actualDurationMinutes:
        bestMatch.movingTimeSeconds !== null ? Math.round(bestMatch.movingTimeSeconds / 60) : null,
      actualDistanceKm:
        bestMatch.distanceMeters != null && bestMatch.distanceMeters > 0
          ? Math.round(bestMatch.distanceMeters / 10) / 100
          : null,
      calories: session.calories ?? bestMatch.calories,
      avgHeartRate: session.avgHeartRate ?? bestMatch.averageHr,
      maxHeartRate: session.maxHeartRate ?? bestMatch.maxHr,
      // isCompleted intentionally NOT touched
      garminAugmented: true,
    };
  });
}

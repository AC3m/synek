import {
  DAYS_OF_WEEK,
  type TrainingSession,
  type SessionsByDay,
  type WeekStats,
  type DayOfWeek,
  type ReorderSessionInput,
} from '~/types/training';
import { getSessionCalendarDate } from '~/lib/utils/date';
import { JUNCTION_SPORT_MAP } from '~/types/junction-poc';
import type { JunctionPocWorkout } from '~/types/junction-poc';

export function groupSessionsByDay(sessions: TrainingSession[]): SessionsByDay {
  const result = {} as SessionsByDay;
  for (const day of DAYS_OF_WEEK) {
    result[day] = [];
  }
  for (const session of sessions) {
    result[session.dayOfWeek]?.push(session);
  }
  // Sort each day by sortOrder
  for (const day of DAYS_OF_WEEK) {
    result[day].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return result;
}

export function computeWeekStats(sessions: TrainingSession[]): WeekStats {
  const training = sessions.filter((s) => !s.goalId);
  const totalSessions = training.filter((s) => s.trainingType !== 'rest_day').length;
  const completedSessions = training.filter(
    (s) => s.isCompleted && s.trainingType !== 'rest_day',
  ).length;
  const totalPlannedKm = training.reduce((sum, s) => sum + (s.plannedDistanceKm ?? 0), 0);
  const totalCompletedKm = training
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + (s.actualDistanceKm ?? s.plannedDistanceKm ?? 0), 0);
  const completedTraining = training.filter((s) => s.trainingType !== 'rest_day' && s.isCompleted);
  const totalActualDurationMinutes = completedTraining.reduce(
    (sum, s) => sum + (s.actualDurationMinutes ?? s.plannedDurationMinutes ?? 0),
    0,
  );
  const totalActualDistanceKm = training.reduce((sum, s) => sum + (s.actualDistanceKm ?? 0), 0);
  const totalCalories = completedTraining.reduce((sum, s) => sum + (s.calories ?? 0), 0);

  return {
    totalSessions,
    completedSessions,
    totalPlannedKm,
    totalCompletedKm,
    completionPercentage: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    totalActualDurationMinutes,
    totalActualDistanceKm,
    totalCalories,
    byType: {},
    competitionSessions: [],
  };
}

/**
 * Computes the result of a drag-and-drop reorder operation.
 * Returns null when the drop is cancelled (over is null).
 * Returns a ReorderSessionInput with the target day and sortOrder otherwise.
 */
export function computeDragResult(
  activeId: string,
  activeDay: DayOfWeek,
  overDay: DayOfWeek | null,
  sessionsByDay: SessionsByDay,
): ReorderSessionInput | null {
  if (overDay === null) return null;

  const targetDay = overDay;
  const targetSessions = sessionsByDay[targetDay] ?? [];

  if (targetDay === activeDay) {
    // Within-day reorder: place after all other sessions in the day
    const others = targetSessions.filter((s) => s.id !== activeId);
    const sortOrder = others.length > 0 ? others[others.length - 1].sortOrder + 1 : 0;
    return { sessionId: activeId, dayOfWeek: targetDay, sortOrder };
  }

  // Cross-day drop: append after existing sessions in the target day
  const sortOrder = targetSessions.length;
  return { sessionId: activeId, dayOfWeek: targetDay, sortOrder };
}

// PoC: Junction Garmin integration — remove after evaluation
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
    // Only back-fill when both actual fields are null — never override manual entries
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
      // isCompleted intentionally NOT touched
    };
  });
}

import { DAYS_OF_WEEK, type TrainingSession, type SessionsByDay, type WeekStats } from '~/types/training';
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
  const totalSessions = sessions.filter(
    (s) => s.trainingType !== 'rest_day'
  ).length;
  const completedSessions = sessions.filter(
    (s) => s.isCompleted && s.trainingType !== 'rest_day'
  ).length;
  const totalPlannedKm = sessions.reduce(
    (sum, s) => sum + (s.plannedDistanceKm ?? 0),
    0
  );
  const totalCompletedKm = sessions
    .filter((s) => s.isCompleted)
    .reduce((sum, s) => sum + (s.plannedDistanceKm ?? 0), 0);
  const totalActualDurationMinutes = sessions
    .filter((s) => s.trainingType !== 'rest_day' && s.isCompleted)
    .reduce((sum, s) => sum + (s.actualDurationMinutes ?? s.plannedDurationMinutes ?? 0), 0);
  const totalActualRunKm = sessions
    .filter((s) => s.trainingType === 'run')
    .reduce((sum, s) => sum + (s.actualDistanceKm ?? 0), 0);

  return {
    totalSessions,
    completedSessions,
    totalPlannedKm,
    totalCompletedKm,
    completionPercentage:
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    totalActualDurationMinutes,
    totalActualRunKm,
  };
}

// PoC: Junction Garmin integration — remove after evaluation
export function augmentSessionsWithGarmin(
  sessions: TrainingSession[],
  garminWorkouts: JunctionPocWorkout[],
  weekStart: string,
): TrainingSession[] {
  if (garminWorkouts.length === 0) return sessions;

  return sessions.map((session) => {
    // Only back-fill when both actual fields are null — never override manual entries
    if (session.actualDurationMinutes !== null || session.actualDistanceKm !== null) {
      return session;
    }

    const calendarDate = getSessionCalendarDate(weekStart, session.dayOfWeek);
    if (!calendarDate) return session;

    const match = garminWorkouts.find(
      (w) =>
        w.calendarDate === calendarDate &&
        w.sportSlug !== null &&
        JUNCTION_SPORT_MAP[w.sportSlug] === session.trainingType,
    );

    if (!match) return session;

    return {
      ...session,
      actualDurationMinutes:
        match.movingTimeSeconds !== null
          ? Math.round(match.movingTimeSeconds / 60)
          : null,
      actualDistanceKm:
        match.distanceMeters != null && match.distanceMeters > 0
          ? Math.round(match.distanceMeters / 10) / 100
          : null,
      // isCompleted intentionally NOT touched
    };
  });
}

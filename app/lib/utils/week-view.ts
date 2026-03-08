import { DAYS_OF_WEEK, type TrainingSession, type SessionsByDay, type WeekStats } from '~/types/training';

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

  return {
    totalSessions,
    completedSessions,
    totalPlannedKm,
    totalCompletedKm,
    completionPercentage:
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
  };
}

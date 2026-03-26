export const queryKeys = {
  weeks: {
    all: ['weeks'] as const,
    byId: (weekStart: string, athleteId: string) =>
      ['weeks', weekStart, athleteId] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    byWeek: (weekPlanId: string) => ['sessions', 'week', weekPlanId] as const,
    byId: (sessionId: string) => ['sessions', sessionId] as const,
  },
  profile: {
    all: ['profile'] as const,
    byId: (userId: string) => ['profile', userId] as const,
  },
  stravaConnection: {
    all: ['stravaConnection'] as const,
    byUser: (userId: string) => ['stravaConnection', userId] as const,
  },
  invites: {
    all: ['invites'] as const,
    byCoach: (coachId: string) => ['invites', coachId] as const,
    preview: (token: string) => ['invites', 'preview', token] as const,
  },
  selfPlan: {
    byAthlete: (athleteId: string) => ['selfPlan', athleteId] as const,
  },
  feedback: {
    all: ['feedback'] as const,
  },
  sessionLaps: {
    all: ['sessionLaps'] as const,
    bySession: (sessionId: string) => ['sessionLaps', sessionId] as const,
  },
  strengthVariants: {
    all: ['strengthVariants'] as const,
    // Specific key for the flat list — does NOT cascade to byId / sessionExercises / etc.
    lists: (userId: string) => ['strengthVariants', 'list', userId] as const,
    byId: (id: string) => ['strengthVariants', id] as const,
    exercises: (variantId: string) => ['strengthVariants', variantId, 'exercises'] as const,
    sessionExercises: (sessionId: string) => ['strengthVariants', 'session', sessionId] as const,
    lastSession: (athleteId: string, exerciseIds: string[]) =>
      ['strengthVariants', 'lastSession', athleteId, ...exerciseIds] as const,
    progressLogs: (variantId: string, athleteId: string) =>
      ['strengthVariants', 'progressLogs', variantId, athleteId] as const,
  },
  // PoC: Junction Garmin integration — remove after evaluation
  junctionPoc: {
    all: ['junction-poc'] as const,
    connection: (userId: string) => ['junction-poc', 'connection', userId] as const,
    workout: (userId: string, date: string | null, type: string) =>
      ['junction-poc', 'workout', userId, date, type] as const,
    weekWorkouts: (userId: string, weekStart: string) =>
      ['junction-poc', 'week-workouts', userId, weekStart] as const,
  },
};

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
  // PoC: Junction Garmin integration — remove after evaluation
  junctionPoc: {
    all: ['junction-poc'] as const,
    connection: (userId: string) => ['junction-poc', 'connection', userId] as const,
  },
};

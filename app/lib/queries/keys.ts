export const queryKeys = {
  weeks: {
    all: ['weeks'] as const,
    byId: (weekStart: string) => ['weeks', weekStart] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    byWeek: (weekPlanId: string) => ['sessions', 'week', weekPlanId] as const,
    byId: (sessionId: string) => ['sessions', sessionId] as const,
  },
};

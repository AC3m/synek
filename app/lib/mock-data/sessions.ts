import type {
  TrainingSession,
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TypeSpecificData,
  CopyWeekInput,
  CopyDayInput,
} from '~/types/training';
import { sessions, delay, nextId } from './_shared';

// ---------------------------------------------------------------------------
// Reset helper — call in beforeEach to prevent state bleed between tests
// ---------------------------------------------------------------------------

// Store the initial seed snapshot once sessions are populated
let seedSnapshot: Map<string, TrainingSession> | null = null;

function captureSeedIfNeeded() {
  if (!seedSnapshot) {
    seedSnapshot = new Map(Array.from(sessions.entries()).map(([k, v]) => [k, structuredClone(v)]));
  }
}

export function resetMockSessions() {
  captureSeedIfNeeded();
  sessions.clear();
  for (const [k, v] of seedSnapshot!.entries()) {
    sessions.set(k, structuredClone(v));
  }
}

export async function mockFetchSessionByGoalId(goalId: string): Promise<TrainingSession | null> {
  await delay();
  for (const s of sessions.values()) {
    if (s.goalId === goalId) return s;
  }
  return null;
}

export async function mockFetchSessionsByWeekPlan(weekPlanId: string): Promise<TrainingSession[]> {
  await delay();
  const result: TrainingSession[] = [];
  for (const s of sessions.values()) {
    if (s.weekPlanId === weekPlanId) result.push(s);
  }
  return result.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function mockCreateSession(input: CreateSessionInput): Promise<TrainingSession> {
  await delay();
  const session: TrainingSession = {
    id: nextId(),
    weekPlanId: input.weekPlanId,
    dayOfWeek: input.dayOfWeek,
    sortOrder: input.sortOrder ?? 0,
    trainingType: input.trainingType,
    description: input.description ?? null,
    coachComments: input.coachComments ?? null,
    plannedDurationMinutes: input.plannedDurationMinutes ?? null,
    plannedDistanceKm: input.plannedDistanceKm ?? null,
    typeSpecificData: input.typeSpecificData ?? ({ type: input.trainingType } as TypeSpecificData),
    isCompleted: input.isCompleted ?? false,
    completedAt: input.completedAt ?? null,
    actualDurationMinutes: input.actualDurationMinutes ?? null,
    actualDistanceKm: input.actualDistanceKm ?? null,
    actualPace: input.actualPace ?? null,
    avgHeartRate: input.avgHeartRate ?? null,
    maxHeartRate: input.maxHeartRate ?? null,
    rpe: input.rpe ?? null,
    calories: input.calories ?? null,
    coachPostFeedback: input.coachPostFeedback ?? null,
    athleteNotes: input.athleteNotes ?? null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(session.id, session);
  return session;
}

export async function mockUpdateSession(input: UpdateSessionInput): Promise<TrainingSession> {
  await delay();
  const existing = sessions.get(input.id);
  if (!existing) throw new Error(`Session ${input.id} not found`);

  const updated: TrainingSession = {
    ...existing,
    ...(input.trainingType !== undefined && { trainingType: input.trainingType }),
    ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.coachComments !== undefined && { coachComments: input.coachComments }),
    ...(input.plannedDurationMinutes !== undefined && {
      plannedDurationMinutes: input.plannedDurationMinutes,
    }),
    ...(input.plannedDistanceKm !== undefined && { plannedDistanceKm: input.plannedDistanceKm }),
    ...(input.typeSpecificData !== undefined && { typeSpecificData: input.typeSpecificData }),
    ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
    ...(input.actualDurationMinutes !== undefined && {
      actualDurationMinutes: input.actualDurationMinutes,
    }),
    ...(input.actualDistanceKm !== undefined && { actualDistanceKm: input.actualDistanceKm }),
    ...(input.actualPace !== undefined && { actualPace: input.actualPace }),
    ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
    ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
    ...(input.rpe !== undefined && { rpe: input.rpe }),
    ...(input.calories !== undefined && { calories: input.calories }),
    ...(input.coachPostFeedback !== undefined && { coachPostFeedback: input.coachPostFeedback }),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
  return updated;
}

export async function mockDeleteSession(sessionId: string): Promise<void> {
  await delay();
  sessions.delete(sessionId);
}

export async function mockUpdateAthleteSession(
  input: AthleteSessionUpdate,
): Promise<TrainingSession> {
  await delay();
  const existing = sessions.get(input.id);
  if (!existing) throw new Error(`Session ${input.id} not found`);

  const updated: TrainingSession = {
    ...existing,
    ...(input.isCompleted !== undefined && {
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted ? new Date().toISOString() : null,
    }),
    ...(input.athleteNotes !== undefined && { athleteNotes: input.athleteNotes }),
    ...(input.actualDurationMinutes !== undefined && {
      actualDurationMinutes: input.actualDurationMinutes,
    }),
    ...(input.actualDistanceKm !== undefined && { actualDistanceKm: input.actualDistanceKm }),
    ...(input.actualPace !== undefined && { actualPace: input.actualPace }),
    ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
    ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
    ...(input.rpe !== undefined && { rpe: input.rpe }),
    ...(input.calories !== undefined && { calories: input.calories }),
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
  return updated;
}

export async function mockConfirmStravaSession(sessionId: string): Promise<void> {
  await delay();
  const existing = sessions.get(sessionId);
  if (!existing) throw new Error(`Session ${sessionId} not found`);

  const updated: TrainingSession = {
    ...existing,
    isStravaConfirmed: true,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
}

export async function mockBulkConfirmStravaSessions(weekPlanId: string): Promise<void> {
  await delay();
  for (const session of sessions.values()) {
    if (
      session.weekPlanId === weekPlanId &&
      session.stravaActivityId != null &&
      !session.isStravaConfirmed
    ) {
      sessions.set(session.id, {
        ...session,
        isStravaConfirmed: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

function copyPlannedFields(
  source: TrainingSession,
  targetWeekPlanId: string,
  targetDay: TrainingSession['dayOfWeek'],
  sortOrder: number,
): TrainingSession {
  const now = new Date().toISOString();
  return {
    id: nextId(),
    weekPlanId: targetWeekPlanId,
    dayOfWeek: targetDay,
    sortOrder,
    trainingType: source.trainingType,
    description: source.description,
    coachComments: source.coachComments,
    plannedDurationMinutes: source.plannedDurationMinutes,
    plannedDistanceKm: source.plannedDistanceKm,
    typeSpecificData: source.typeSpecificData,
    // actual / athlete / strava fields reset
    isCompleted: false,
    completedAt: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    calories: null,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function mockCopyWeekSessions(input: CopyWeekInput): Promise<number> {
  await delay();
  const sourceSessions = Array.from(sessions.values()).filter(
    (s) => s.weekPlanId === input.sourceWeekPlanId && s.trainingType !== 'rest_day',
  );
  for (const source of sourceSessions) {
    const copied = copyPlannedFields(
      source,
      input.targetWeekPlanId,
      source.dayOfWeek,
      source.sortOrder,
    );
    sessions.set(copied.id, copied);
  }
  return sourceSessions.length;
}

export async function mockCopyDaySessions(input: CopyDayInput): Promise<number> {
  await delay();
  const sourceSessions = Array.from(sessions.values())
    .filter(
      (s) =>
        s.weekPlanId === input.sourceWeekPlanId &&
        s.dayOfWeek === input.sourceDay &&
        s.trainingType !== 'rest_day',
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Compute sort offset: append after any existing target-day sessions
  const targetDaySessions = Array.from(sessions.values()).filter(
    (s) => s.weekPlanId === input.targetWeekPlanId && s.dayOfWeek === input.targetDay,
  );
  const sortOffset = targetDaySessions.length;

  for (let i = 0; i < sourceSessions.length; i++) {
    const copied = copyPlannedFields(
      sourceSessions[i],
      input.targetWeekPlanId,
      input.targetDay,
      sortOffset + i,
    );
    sessions.set(copied.id, copied);
  }
  return sourceSessions.length;
}

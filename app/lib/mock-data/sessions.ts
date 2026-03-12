import type {
  TrainingSession,
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TypeSpecificData,
} from '~/types/training';
import { sessions, delay, nextId } from './_shared';

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
    typeSpecificData:
      input.typeSpecificData ?? ({ type: input.trainingType } as TypeSpecificData),
    isCompleted: input.isCompleted ?? false,
    completedAt: input.completedAt ?? null,
    actualDurationMinutes: input.actualDurationMinutes ?? null,
    actualDistanceKm: input.actualDistanceKm ?? null,
    actualPace: input.actualPace ?? null,
    avgHeartRate: input.avgHeartRate ?? null,
    maxHeartRate: input.maxHeartRate ?? null,
    rpe: input.rpe ?? null,
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
  input: AthleteSessionUpdate
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

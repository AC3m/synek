import type {
  StrengthVariant,
  StrengthVariantExercise,
  StrengthSessionExercise,
  ProgressionIntent,
} from '~/types/training';
import { delay } from './_shared';

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

export const strengthVariants = new Map<string, StrengthVariant>();
export const strengthSessionExercises = new Map<string, StrengthSessionExercise>();

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const PUSH_DAY_A_ID = 'sv-push-day-a';
const PULL_DAY_B_ID = 'sv-pull-day-b';

const PUSH_EXERCISES: StrengthVariantExercise[] = [
  {
    id: 'sve-bench-press',
    variantId: PUSH_DAY_A_ID,
    name: 'Bench Press',
    videoUrl: null,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    perSetReps: [
      { repsMin: 12, repsMax: 12 },
      { repsMin: 10, repsMax: 10 },
      { repsMin: 8, repsMax: 8 },
    ],
    sortOrder: 0,
    loadUnit: 'kg',
    supersetGroup: null,
    progressionIncrement: 2.5,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sve-ohp',
    variantId: PUSH_DAY_A_ID,
    name: 'Overhead Press',
    videoUrl: null,
    sets: 3,
    repsMin: 6,
    repsMax: 10,
    loadUnit: 'kg',
    sortOrder: 1,
    supersetGroup: null,
    perSetReps: null,
    progressionIncrement: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sve-tricep-dips',
    variantId: PUSH_DAY_A_ID,
    name: 'Tricep Dips',
    videoUrl: null,
    sets: 3,
    repsMin: 10,
    repsMax: 15,
    loadUnit: 'kg',
    sortOrder: 2,
    supersetGroup: null,
    perSetReps: null,
    progressionIncrement: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
];

const PULL_EXERCISES: StrengthVariantExercise[] = [
  {
    id: 'sve-pullups',
    variantId: PULL_DAY_B_ID,
    name: 'Pull-ups',
    videoUrl: null,
    sets: 3,
    repsMin: 6,
    repsMax: 10,
    loadUnit: 'kg',
    sortOrder: 0,
    supersetGroup: 1,
    perSetReps: null,
    progressionIncrement: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sve-bb-row',
    variantId: PULL_DAY_B_ID,
    name: 'Barbell Row',
    videoUrl: null,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    loadUnit: 'kg',
    sortOrder: 1,
    supersetGroup: 1,
    perSetReps: null,
    progressionIncrement: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'sve-bicep-curl',
    variantId: PULL_DAY_B_ID,
    name: 'Bicep Curl',
    videoUrl: null,
    sets: 3,
    repsMin: 10,
    repsMax: 15,
    loadUnit: 'kg',
    sortOrder: 2,
    supersetGroup: null,
    perSetReps: null,
    progressionIncrement: null,
    createdAt: '2026-03-01T10:00:00Z',
  },
];

const SEED_VARIANTS: StrengthVariant[] = [
  {
    id: PUSH_DAY_A_ID,
    userId: 'athlete-1',
    name: 'Push Day A',
    description: 'Chest, shoulders, and triceps',
    exercises: PUSH_EXERCISES,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: PULL_DAY_B_ID,
    userId: 'athlete-1',
    name: 'Pull Day B',
    description: 'Back and biceps',
    exercises: PULL_EXERCISES,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
];

// Seed session exercises — simulate one completed session per variant for pre-fill
const SEED_SESSION_EXERCISES: StrengthSessionExercise[] = [
  {
    id: 'sse-1',
    sessionId: 's-w09-a1-2',
    variantExerciseId: 'sve-bench-press',
    actualReps: 10,
    loadKg: 80,
    progression: 'up' as ProgressionIntent,
    notes: null,
    sortOrder: 0,
    createdAt: '2026-02-24T17:00:00Z',
    setsData: [
      { reps: 10, loadKg: 80 },
      { reps: 10, loadKg: 80 },
      { reps: 9, loadKg: 80 },
    ],
  },
  {
    id: 'sse-2',
    sessionId: 's-w09-a1-2',
    variantExerciseId: 'sve-ohp',
    actualReps: 8,
    loadKg: 50,
    progression: 'up' as ProgressionIntent,
    notes: null,
    sortOrder: 1,
    createdAt: '2026-02-24T17:00:00Z',
    setsData: [
      { reps: 8, loadKg: 50 },
      { reps: 7, loadKg: 50 },
      { reps: 7, loadKg: 50 },
    ],
  },
  {
    id: 'sse-3',
    sessionId: 's-w09-a1-2',
    variantExerciseId: 'sve-tricep-dips',
    actualReps: 12,
    loadKg: 0,
    progression: 'maintain' as ProgressionIntent,
    notes: null,
    sortOrder: 2,
    createdAt: '2026-02-24T17:00:00Z',
    setsData: [
      { reps: 12, loadKg: 0 },
      { reps: 11, loadKg: 0 },
      { reps: 10, loadKg: 0 },
    ],
  },
  {
    id: 'sse-4',
    sessionId: 's-w10-a1-2',
    variantExerciseId: 'sve-pullups',
    actualReps: 8,
    loadKg: 0,
    progression: 'up' as ProgressionIntent,
    notes: null,
    sortOrder: 0,
    createdAt: '2026-03-03T17:30:00Z',
    setsData: [
      { reps: 8, loadKg: 0 },
      { reps: 7, loadKg: 0 },
      { reps: 6, loadKg: 0 },
    ],
  },
  {
    id: 'sse-5',
    sessionId: 's-w10-a1-2',
    variantExerciseId: 'sve-bb-row',
    actualReps: 10,
    loadKg: 60,
    progression: 'maintain' as ProgressionIntent,
    notes: null,
    sortOrder: 1,
    createdAt: '2026-03-03T17:30:00Z',
    setsData: [
      { reps: 10, loadKg: 60 },
      { reps: 10, loadKg: 60 },
      { reps: 9, loadKg: 60 },
    ],
  },
  {
    id: 'sse-6',
    sessionId: 's-w10-a1-2',
    variantExerciseId: 'sve-bicep-curl',
    actualReps: 12,
    loadKg: 15,
    progression: 'maintain' as ProgressionIntent,
    notes: null,
    sortOrder: 2,
    createdAt: '2026-03-03T17:30:00Z',
    setsData: [
      { reps: 12, loadKg: 15 },
      { reps: 12, loadKg: 15 },
      { reps: 11, loadKg: 15 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seed initializer
// ---------------------------------------------------------------------------

function seedStrengthVariants() {
  for (const v of SEED_VARIANTS) {
    strengthVariants.set(v.id, structuredClone(v));
  }
  for (const se of SEED_SESSION_EXERCISES) {
    strengthSessionExercises.set(se.id, structuredClone(se));
  }
}

// ---------------------------------------------------------------------------
// Reset helper — call in beforeEach to prevent state bleed between tests
// ---------------------------------------------------------------------------

let seedVariantsSnapshot: Map<string, StrengthVariant> | null = null;
let seedSessionExercisesSnapshot: Map<string, StrengthSessionExercise> | null = null;

function captureSnapshotIfNeeded() {
  if (!seedVariantsSnapshot) {
    seedVariantsSnapshot = new Map(
      Array.from(strengthVariants.entries()).map(([k, v]) => [k, structuredClone(v)]),
    );
    seedSessionExercisesSnapshot = new Map(
      Array.from(strengthSessionExercises.entries()).map(([k, v]) => [k, structuredClone(v)]),
    );
  }
}

export function resetMockStrengthVariants() {
  captureSnapshotIfNeeded();
  strengthVariants.clear();
  for (const [k, v] of seedVariantsSnapshot!.entries()) {
    strengthVariants.set(k, structuredClone(v));
  }
  strengthSessionExercises.clear();
  for (const [k, v] of seedSessionExercisesSnapshot!.entries()) {
    strengthSessionExercises.set(k, structuredClone(v));
  }
}

// ---------------------------------------------------------------------------
// Mock query functions — exported for independent unit testing
// ---------------------------------------------------------------------------

let mockIdCounter = 200;
function nextMockId() {
  return `mock-sv-${++mockIdCounter}`;
}

export async function mockFetchStrengthVariants(userId: string): Promise<StrengthVariant[]> {
  await delay();
  return Array.from(strengthVariants.values()).filter((v) => v.userId === userId);
}

export async function mockFetchStrengthVariant(id: string): Promise<StrengthVariant | null> {
  await delay();
  return strengthVariants.get(id) ?? null;
}

export async function mockCreateStrengthVariant(input: {
  userId: string;
  name: string;
  description?: string;
  exercises: Array<{
    name: string;
    videoUrl?: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    perSetReps?: { repsMin: number; repsMax: number }[] | null;
    sortOrder: number;
    loadUnit?: 'kg' | 'sec';
    supersetGroup?: number | null;
    progressionIncrement?: number | null;
  }>;
}): Promise<StrengthVariant> {
  await delay();
  const id = nextMockId();
  const now = new Date().toISOString();
  const exercises: StrengthVariantExercise[] = input.exercises.map((ex) => ({
    id: nextMockId(),
    variantId: id,
    name: ex.name,
    videoUrl: ex.videoUrl ?? null,
    sets: ex.sets,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    perSetReps: ex.perSetReps ?? null,
    loadUnit: ex.loadUnit ?? 'kg',
    sortOrder: ex.sortOrder,
    supersetGroup: ex.supersetGroup ?? null,
    progressionIncrement: ex.progressionIncrement ?? null,
    createdAt: now,
  }));
  const variant: StrengthVariant = {
    id,
    userId: input.userId,
    name: input.name,
    description: input.description ?? null,
    exercises,
    createdAt: now,
    updatedAt: now,
  };
  strengthVariants.set(id, variant);
  return structuredClone(variant);
}

export async function mockUpdateStrengthVariant(input: {
  id: string;
  name?: string;
  description?: string | null;
}): Promise<StrengthVariant> {
  await delay();
  const variant = strengthVariants.get(input.id);
  if (!variant) throw new Error(`Variant ${input.id} not found`);
  const updated: StrengthVariant = {
    ...variant,
    name: input.name ?? variant.name,
    description: input.description !== undefined ? input.description : variant.description,
    updatedAt: new Date().toISOString(),
  };
  strengthVariants.set(input.id, updated);
  return structuredClone(updated);
}

export async function mockDeleteStrengthVariant(id: string): Promise<void> {
  await delay();
  strengthVariants.delete(id);
}

export async function mockUpsertVariantExercises(input: {
  variantId: string;
  exercises: Array<{
    id?: string;
    name: string;
    videoUrl?: string | null;
    sets: number;
    repsMin: number;
    repsMax: number;
    perSetReps?: { repsMin: number; repsMax: number }[] | null;
    sortOrder: number;
    loadUnit?: 'kg' | 'sec';
    supersetGroup?: number | null;
    progressionIncrement?: number | null;
  }>;
}): Promise<StrengthVariantExercise[]> {
  await delay();
  const variant = strengthVariants.get(input.variantId);
  if (!variant) throw new Error(`Variant ${input.variantId} not found`);
  const now = new Date().toISOString();
  const exercises: StrengthVariantExercise[] = input.exercises.map((ex) => ({
    id: ex.id ?? nextMockId(),
    variantId: input.variantId,
    name: ex.name,
    videoUrl: ex.videoUrl ?? null,
    sets: ex.sets,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    perSetReps: ex.perSetReps ?? null,
    loadUnit: ex.loadUnit ?? 'kg',
    sortOrder: ex.sortOrder,
    supersetGroup: ex.supersetGroup ?? null,
    progressionIncrement: ex.progressionIncrement ?? null,
    createdAt: now,
  }));
  const updated = { ...variant, exercises, updatedAt: now };
  strengthVariants.set(input.variantId, updated);
  return structuredClone(exercises);
}

export async function mockFetchStrengthSessionExercises(
  sessionId: string,
): Promise<StrengthSessionExercise[]> {
  await delay();
  return Array.from(strengthSessionExercises.values())
    .filter((se) => se.sessionId === sessionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function mockUpsertSessionExercises(input: {
  sessionId: string;
  exercises: Array<{
    variantExerciseId: string;
    actualReps?: number | null;
    loadKg?: number | null;
    progression?: ProgressionIntent | null;
    notes?: string | null;
    sortOrder: number;
    setsData?: Array<{ reps: number | null; loadKg: number | null }>;
  }>;
}): Promise<StrengthSessionExercise[]> {
  await delay();
  // Remove existing entries for this session
  for (const [k, v] of strengthSessionExercises.entries()) {
    if (v.sessionId === input.sessionId) strengthSessionExercises.delete(k);
  }
  const now = new Date().toISOString();
  const result: StrengthSessionExercise[] = input.exercises.map((ex) => {
    const entry: StrengthSessionExercise = {
      id: nextMockId(),
      sessionId: input.sessionId,
      variantExerciseId: ex.variantExerciseId,
      actualReps: ex.actualReps ?? null,
      loadKg: ex.loadKg ?? null,
      progression: ex.progression ?? null,
      notes: ex.notes ?? null,
      sortOrder: ex.sortOrder,
      createdAt: now,
      setsData: ex.setsData ?? [],
    };
    strengthSessionExercises.set(entry.id, entry);
    return entry;
  });
  return result;
}

export async function mockFetchLastSessionExercises(
  athleteId: string,
  exerciseIds: string[],
  beforeDate?: string | null,
): Promise<{ data: Record<string, StrengthSessionExercise>; date: string | null }> {
  await delay();
  if (!athleteId || exerciseIds.length === 0) return { data: {}, date: null };

  // Build latest entry per exercise across all completed sessions for this athlete
  // In mock mode: we use the seed session exercises and the sessions from _shared.ts
  // Sessions from _shared.ts that are completed: s-w09-a1-2 (athlete-1) and s-w10-a1-2 (athlete-1)
  const completedSessionIds = new Set(['s-w09-a1-2', 's-w10-a1-2']);

  const latestByExercise = new Map<string, StrengthSessionExercise & { completedAt: string }>();

  for (const se of strengthSessionExercises.values()) {
    if (!se.variantExerciseId) continue;
    if (!exerciseIds.includes(se.variantExerciseId)) continue;
    if (!completedSessionIds.has(se.sessionId)) continue;
    if (beforeDate && se.createdAt.split('T')[0] >= beforeDate) continue;

    const existing = latestByExercise.get(se.variantExerciseId);
    const seDate = se.createdAt; // use createdAt as proxy for completedAt in mock
    if (!existing || seDate > existing.completedAt) {
      latestByExercise.set(se.variantExerciseId, { ...se, completedAt: seDate });
    }
  }

  const data: Record<string, StrengthSessionExercise> = {};
  let lastDate: string | null = null;
  for (const [exerciseId, se] of latestByExercise.entries()) {
    data[exerciseId] = se;
    if (!lastDate || se.completedAt > lastDate) lastDate = se.completedAt;
  }

  return { data, date: lastDate };
}

export async function mockFetchVariantProgressLogs(
  variantId: string,
  athleteId: string,
): Promise<import('~/types/training').ProgressLog[]> {
  await delay();
  const variant = strengthVariants.get(variantId);
  if (!variant || variant.userId !== athleteId) return [];

  const exerciseMap = new Map(variant.exercises.map((ex) => [ex.id, ex]));
  const logs: import('~/types/training').ProgressLog[] = [];

  for (const se of strengthSessionExercises.values()) {
    if (!se.variantExerciseId) continue;
    const exercise = exerciseMap.get(se.variantExerciseId);
    if (!exercise) continue;
    logs.push({
      id: se.id,
      sessionId: se.sessionId,
      sessionDate: se.createdAt.split('T')[0],
      exerciseId: se.variantExerciseId,
      exerciseName: exercise.name,
      actualReps: se.actualReps,
      loadKg: se.loadKg,
      progression: se.progression,
      sets: exercise.sets,
    });
  }

  return logs.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

// Run seed at module load
seedStrengthVariants();

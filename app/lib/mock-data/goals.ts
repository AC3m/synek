import type { Goal, CreateGoalInput, UpdateGoalInput } from '~/types/training';
import { delay, nextId } from './_shared';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const goalsStore = new Map<string, Goal>();

// ---------------------------------------------------------------------------
// Seed data — two goals for athlete-1
// ---------------------------------------------------------------------------

const SEED: Goal[] = [
  {
    id: 'goal-1',
    athleteId: 'athlete-1',
    createdBy: 'coach-1',
    name: 'Spring 10K',
    discipline: 'run',
    // 8 weeks from a fixed reference date (2026-03-28)
    competitionDate: '2026-05-23',
    preparationWeeks: 8,
    goalDistanceKm: 10,
    goalTimeSeconds: 3000, // 50 min
    notes: 'First 10K race of the season',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'goal-2',
    athleteId: 'athlete-1',
    createdBy: 'coach-1',
    name: 'City Gran Fondo',
    discipline: 'cycling',
    // Past competition with result filled
    competitionDate: '2026-02-14',
    preparationWeeks: 6,
    goalDistanceKm: 100,
    goalTimeSeconds: 14400, // 4 hours
    notes: 'Gran Fondo — aim sub-4h',
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-02-15T12:00:00Z',
  },
];

function captureSeed(): Goal[] {
  return SEED.map((g) => ({ ...g }));
}

export function resetMockGoals() {
  goalsStore.clear();
  for (const g of captureSeed()) {
    goalsStore.set(g.id, g);
  }
}

// Seed on module load
resetMockGoals();

// ---------------------------------------------------------------------------
// Mock CRUD
// ---------------------------------------------------------------------------

export async function mockFetchGoals(athleteId: string): Promise<Goal[]> {
  await delay();
  const result: Goal[] = [];
  for (const g of goalsStore.values()) {
    if (g.athleteId === athleteId) result.push(g);
  }
  return result.sort(
    (a, b) => new Date(a.competitionDate).getTime() - new Date(b.competitionDate).getTime()
  );
}

export async function mockCreateGoal(input: CreateGoalInput & { createdBy: string }): Promise<Goal> {
  await delay();
  const now = new Date().toISOString();
  const goal: Goal = {
    id: nextId(),
    athleteId: input.athleteId,
    createdBy: input.createdBy,
    name: input.name,
    discipline: input.discipline,
    competitionDate: input.competitionDate,
    preparationWeeks: input.preparationWeeks,
    goalDistanceKm: input.goalDistanceKm ?? null,
    goalTimeSeconds: input.goalTimeSeconds ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  goalsStore.set(goal.id, goal);
  return goal;
}

export async function mockUpdateGoal(input: UpdateGoalInput): Promise<Goal> {
  await delay();
  const existing = goalsStore.get(input.id);
  if (!existing) throw new Error(`Goal ${input.id} not found`);
  const updated: Goal = {
    ...existing,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.discipline !== undefined && { discipline: input.discipline }),
    ...(input.competitionDate !== undefined && { competitionDate: input.competitionDate }),
    ...(input.preparationWeeks !== undefined && { preparationWeeks: input.preparationWeeks }),
    ...(input.goalDistanceKm !== undefined && { goalDistanceKm: input.goalDistanceKm }),
    ...(input.goalTimeSeconds !== undefined && { goalTimeSeconds: input.goalTimeSeconds }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updatedAt: new Date().toISOString(),
  };
  goalsStore.set(updated.id, updated);
  return updated;
}

export async function mockDeleteGoal(id: string): Promise<void> {
  await delay();
  goalsStore.delete(id);
}

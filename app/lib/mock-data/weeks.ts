import type { WeekPlan, CreateWeekPlanInput, UpdateWeekPlanInput } from '~/types/training';
import { weekPlans, getAthleteMap, delay, nextId } from './_shared';

export async function mockFetchWeekPlanByDate(
  weekStart: string,
  athleteId: string,
): Promise<WeekPlan | null> {
  await delay();
  return weekPlans.get(athleteId)?.get(weekStart) ?? null;
}

export async function mockCreateWeekPlan(input: CreateWeekPlanInput): Promise<WeekPlan> {
  await delay();
  const plan: WeekPlan = {
    id: nextId(),
    athleteId: input.athleteId,
    weekStart: input.weekStart,
    year: input.year,
    weekNumber: input.weekNumber,
    loadType: input.loadType ?? null,
    totalPlannedKm: input.totalPlannedKm ?? null,
    description: input.description ?? null,
    coachComments: input.coachComments ?? null,
    actualTotalKm: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const map = getAthleteMap(input.athleteId);
  map.set(plan.weekStart, plan);
  return plan;
}

export async function mockUpdateWeekPlan(input: UpdateWeekPlanInput): Promise<WeekPlan> {
  await delay();
  let found: WeekPlan | undefined;
  for (const athleteMap of weekPlans.values()) {
    for (const wp of athleteMap.values()) {
      if (wp.id === input.id) {
        found = wp;
        break;
      }
    }
    if (found) break;
  }
  if (!found) throw new Error(`Week plan ${input.id} not found`);

  const updated: WeekPlan = {
    ...found,
    ...(input.loadType !== undefined && { loadType: input.loadType }),
    ...(input.totalPlannedKm !== undefined && { totalPlannedKm: input.totalPlannedKm }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.coachComments !== undefined && { coachComments: input.coachComments }),
    ...(input.actualTotalKm !== undefined && { actualTotalKm: input.actualTotalKm }),
    updatedAt: new Date().toISOString(),
  };
  const map = getAthleteMap(updated.athleteId);
  map.set(updated.weekStart, updated);
  return updated;
}

export async function mockGetOrCreateWeekPlan(
  weekStart: string,
  year: number,
  weekNumber: number,
  athleteId: string,
): Promise<WeekPlan> {
  const existing = await mockFetchWeekPlanByDate(weekStart, athleteId);
  if (existing) return existing;
  return mockCreateWeekPlan({ weekStart, year, weekNumber, athleteId });
}

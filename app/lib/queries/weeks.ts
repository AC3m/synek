import { supabase, isMockMode } from '~/lib/supabase';
import {
  mockFetchWeekPlanByDate,
  mockCreateWeekPlan,
  mockUpdateWeekPlan,
  mockGetOrCreateWeekPlan,
} from '~/lib/mock-data';
import type {
  WeekPlan,
  CreateWeekPlanInput,
  UpdateWeekPlanInput,
} from '~/types/training';

// DB row → app type mapper
function toWeekPlan(row: Record<string, unknown>): WeekPlan {
  return {
    id: row.id as string,
    athleteId: row.athlete_id as string,
    weekStart: row.week_start as string,
    year: row.year as number,
    weekNumber: row.week_number as number,
    loadType: row.load_type as WeekPlan['loadType'],
    totalPlannedKm: row.total_planned_km as number | null,
    description: row.description as string | null,
    coachComments: row.coach_comments as string | null,
    actualTotalKm: row.actual_total_km as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchWeekPlanByDate(
  weekStart: string,
  athleteId: string
): Promise<WeekPlan | null> {
  if (isMockMode) return mockFetchWeekPlanByDate(weekStart, athleteId);
  const { data, error } = await supabase
    .from('week_plans')
    .select('*')
    .eq('week_start', weekStart)
    .eq('athlete_id', athleteId)
    .maybeSingle();

  if (error) throw error;
  return data ? toWeekPlan(data) : null;
}

export async function createWeekPlan(
  input: CreateWeekPlanInput
): Promise<WeekPlan> {
  if (isMockMode) return mockCreateWeekPlan(input);
  const { data, error } = await supabase
    .from('week_plans')
    .insert({
      athlete_id: input.athleteId,
      week_start: input.weekStart,
      year: input.year,
      week_number: input.weekNumber,
      load_type: input.loadType ?? null,
      total_planned_km: input.totalPlannedKm ?? null,
      description: input.description ?? null,
      coach_comments: input.coachComments ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return toWeekPlan(data);
}

export async function updateWeekPlan(
  input: UpdateWeekPlanInput
): Promise<WeekPlan> {
  if (isMockMode) return mockUpdateWeekPlan(input);
  const updates: Record<string, unknown> = {};
  if (input.loadType !== undefined) updates.load_type = input.loadType;
  if (input.totalPlannedKm !== undefined)
    updates.total_planned_km = input.totalPlannedKm;
  if (input.description !== undefined) updates.description = input.description;
  if (input.coachComments !== undefined)
    updates.coach_comments = input.coachComments;
  if (input.actualTotalKm !== undefined)
    updates.actual_total_km = input.actualTotalKm;

  const { data, error } = await supabase
    .from('week_plans')
    .update(updates)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw error;
  return toWeekPlan(data);
}

export async function getOrCreateWeekPlan(
  weekStart: string,
  year: number,
  weekNumber: number,
  athleteId: string
): Promise<WeekPlan> {
  if (isMockMode)
    return mockGetOrCreateWeekPlan(weekStart, year, weekNumber, athleteId);
  const existing = await fetchWeekPlanByDate(weekStart, athleteId);
  if (existing) return existing;
  return createWeekPlan({ weekStart, year, weekNumber, athleteId });
}

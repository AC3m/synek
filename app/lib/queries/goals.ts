import { supabase, isMockMode } from '~/lib/supabase';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '~/types/training';
import {
  mockFetchGoals,
  mockCreateGoal,
  mockUpdateGoal,
  mockDeleteGoal,
} from '~/lib/mock-data/goals';

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

export function toGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    athleteId: row.athlete_id as string,
    createdBy: row.created_by as string,
    name: row.name as string,
    discipline: row.discipline as Goal['discipline'],
    competitionDate: row.competition_date as string,
    preparationWeeks: row.preparation_weeks as number,
    goalDistanceKm: row.goal_distance_km != null ? Number(row.goal_distance_km) : null,
    goalTimeSeconds: row.goal_time_seconds != null ? (row.goal_time_seconds as number) : null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Real queries
// ---------------------------------------------------------------------------

const GOAL_COLUMNS =
  'id, athlete_id, created_by, name, discipline, competition_date, preparation_weeks, goal_distance_km, goal_time_seconds, notes, created_at, updated_at';

async function realFetchGoals(athleteId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(GOAL_COLUMNS)
    .eq('athlete_id', athleteId)
    .order('competition_date', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => toGoal(r as Record<string, unknown>));
}

async function realCreateGoal(input: CreateGoalInput & { createdBy: string }): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      athlete_id: input.athleteId,
      created_by: input.createdBy,
      name: input.name,
      discipline: input.discipline,
      competition_date: input.competitionDate,
      preparation_weeks: input.preparationWeeks,
      goal_distance_km: input.goalDistanceKm ?? null,
      goal_time_seconds: input.goalTimeSeconds ?? null,
      notes: input.notes ?? null,
    })
    .select(GOAL_COLUMNS)
    .single();

  if (error) throw error;
  return toGoal(data as Record<string, unknown>);
}

async function realUpdateGoal(input: UpdateGoalInput): Promise<Goal> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.discipline !== undefined) patch.discipline = input.discipline;
  if (input.competitionDate !== undefined) patch.competition_date = input.competitionDate;
  if (input.preparationWeeks !== undefined) patch.preparation_weeks = input.preparationWeeks;
  if (input.goalDistanceKm !== undefined) patch.goal_distance_km = input.goalDistanceKm;
  if (input.goalTimeSeconds !== undefined) patch.goal_time_seconds = input.goalTimeSeconds;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', input.id)
    .select(GOAL_COLUMNS)
    .single();

  if (error) throw error;
  return toGoal(data as Record<string, unknown>);
}

async function realDeleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Exported functions — gated by isMockMode
// ---------------------------------------------------------------------------

export async function fetchGoals(athleteId: string): Promise<Goal[]> {
  if (isMockMode) return mockFetchGoals(athleteId);
  return realFetchGoals(athleteId);
}

export async function createGoal(input: CreateGoalInput & { createdBy: string }): Promise<Goal> {
  if (isMockMode) return mockCreateGoal(input);
  return realCreateGoal(input);
}

export async function updateGoal(input: UpdateGoalInput): Promise<Goal> {
  if (isMockMode) return mockUpdateGoal(input);
  return realUpdateGoal(input);
}

export async function deleteGoal(id: string): Promise<void> {
  if (isMockMode) return mockDeleteGoal(id);
  return realDeleteGoal(id);
}

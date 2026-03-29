import { describe, expect, it } from 'vitest';
import { toGoal } from '~/lib/queries/goals';

const VALID_ROW = {
  id: 'g-uuid-1',
  athlete_id: 'a-uuid-1',
  created_by: 'c-uuid-1',
  name: 'Spring 10K',
  discipline: 'run',
  competition_date: '2026-05-23',
  preparation_weeks: 8,
  goal_distance_km: '10.00',
  goal_time_seconds: 3000,
  notes: 'First race of the season',
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-02T10:00:00Z',
};

describe('toGoal', () => {
  it('(a) maps all snake_case DB columns to camelCase Goal fields', () => {
    const goal = toGoal(VALID_ROW);
    expect(goal.id).toBe('g-uuid-1');
    expect(goal.athleteId).toBe('a-uuid-1');
    expect(goal.createdBy).toBe('c-uuid-1');
    expect(goal.competitionDate).toBe('2026-05-23');
    expect(goal.preparationWeeks).toBe(8);
    expect(goal.goalDistanceKm).toBe(10);
    expect(goal.goalTimeSeconds).toBe(3000);
    expect(goal.createdAt).toBe('2026-03-01T10:00:00Z');
    expect(goal.updatedAt).toBe('2026-03-02T10:00:00Z');
  });

  it('(b) preserves nullable fields as null when absent', () => {
    const row = { ...VALID_ROW, goal_distance_km: null, goal_time_seconds: null, notes: null };
    const goal = toGoal(row);
    expect(goal.goalDistanceKm).toBeNull();
    expect(goal.goalTimeSeconds).toBeNull();
    expect(goal.notes).toBeNull();
  });

  it('(c) forwards required string fields unchanged', () => {
    const goal = toGoal(VALID_ROW);
    expect(goal.id).toBe(VALID_ROW.id);
    expect(goal.name).toBe(VALID_ROW.name);
    expect(goal.discipline).toBe('run');
  });
});

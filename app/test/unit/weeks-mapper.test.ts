import { toWeekPlan } from '~/lib/queries/weeks';

const baseRow: Record<string, unknown> = {
  id: 'plan-123',
  athlete_id: 'athlete-1',
  week_start: '2026-03-02',
  year: 2026,
  week_number: 10,
  load_type: 'medium',
  total_planned_km: 65.5,
  description: 'Build week',
  coach_comments: 'Focus on aerobic base',
  actual_total_km: 63.0,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-08T00:00:00Z',
};

describe('toWeekPlan (row mapper)', () => {
  it('maps snake_case DB fields to camelCase application fields', () => {
    const plan = toWeekPlan(baseRow);
    expect(plan.id).toBe('plan-123');
    expect(plan.athleteId).toBe('athlete-1');
    expect(plan.weekStart).toBe('2026-03-02');
    expect(plan.year).toBe(2026);
    expect(plan.weekNumber).toBe(10);
    expect(plan.loadType).toBe('medium');
    expect(plan.totalPlannedKm).toBe(65.5);
    expect(plan.description).toBe('Build week');
    expect(plan.coachComments).toBe('Focus on aerobic base');
    expect(plan.actualTotalKm).toBe(63.0);
    expect(plan.createdAt).toBe('2026-03-01T00:00:00Z');
    expect(plan.updatedAt).toBe('2026-03-08T00:00:00Z');
  });

  it('preserves null for optional numeric fields', () => {
    const row = {
      ...baseRow,
      total_planned_km: null,
      actual_total_km: null,
      load_type: null,
      description: null,
      coach_comments: null,
    };
    const plan = toWeekPlan(row);
    expect(plan.totalPlannedKm).toBeNull();
    expect(plan.actualTotalKm).toBeNull();
    expect(plan.loadType).toBeNull();
    expect(plan.description).toBeNull();
    expect(plan.coachComments).toBeNull();
  });

  it('correctly maps week_number to weekNumber (not weekId)', () => {
    // Ensures the field name doesn't get conflated with the ISO weekId string
    const plan = toWeekPlan(baseRow);
    expect(plan.weekNumber).toBe(10);
    expect(typeof plan.weekNumber).toBe('number');
  });
});

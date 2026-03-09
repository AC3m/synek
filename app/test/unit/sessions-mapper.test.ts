import { toSession } from '~/lib/queries/sessions';

// A representative DB row matching the training_sessions table shape
const baseRow: Record<string, unknown> = {
  id: 'session-abc',
  week_plan_id: 'plan-xyz',
  day_of_week: 'wednesday',
  sort_order: 3,
  training_type: 'run',
  description: 'Easy 10k',
  coach_comments: 'Stay in zone 2',
  planned_duration_minutes: 60,
  planned_distance_km: 10,
  type_specific_data: { type: 'run', pace_target: '5:30/km' },
  is_completed: true,
  completed_at: '2026-03-04T08:00:00Z',
  actual_duration_minutes: 65,
  actual_distance_km: 10.2,
  actual_pace: '5:22/km',
  avg_heart_rate: 148,
  max_heart_rate: 162,
  rpe: 6,
  coach_post_feedback: 'Good effort',
  trainee_notes: 'Felt strong',
  strava_activity_id: 12345,
  strava_synced_at: '2026-03-04T09:00:00Z',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-04T09:00:00Z',
};

describe('toSession (row mapper)', () => {
  it('maps snake_case DB fields to camelCase application fields', () => {
    const session = toSession(baseRow);
    expect(session.id).toBe('session-abc');
    expect(session.weekPlanId).toBe('plan-xyz');
    expect(session.dayOfWeek).toBe('wednesday');
    expect(session.sortOrder).toBe(3);
    expect(session.trainingType).toBe('run');
    expect(session.description).toBe('Easy 10k');
    expect(session.coachComments).toBe('Stay in zone 2');
    expect(session.plannedDurationMinutes).toBe(60);
    expect(session.plannedDistanceKm).toBe(10);
    expect(session.isCompleted).toBe(true);
    expect(session.completedAt).toBe('2026-03-04T08:00:00Z');
    expect(session.actualDurationMinutes).toBe(65);
    expect(session.actualDistanceKm).toBe(10.2);
    expect(session.actualPace).toBe('5:22/km');
    expect(session.avgHeartRate).toBe(148);
    expect(session.maxHeartRate).toBe(162);
    expect(session.rpe).toBe(6);
    expect(session.coachPostFeedback).toBe('Good effort');
    expect(session.stravaActivityId).toBe(12345);
    expect(session.stravaSyncedAt).toBe('2026-03-04T09:00:00Z');
    expect(session.createdAt).toBe('2026-03-01T00:00:00Z');
    expect(session.updatedAt).toBe('2026-03-04T09:00:00Z');
  });

  it('maps trainee_notes to athleteNotes (field rename)', () => {
    const session = toSession(baseRow);
    expect(session.athleteNotes).toBe('Felt strong');
  });

  it('preserves typeSpecificData from the row', () => {
    const session = toSession(baseRow);
    expect(session.typeSpecificData).toEqual({ type: 'run', pace_target: '5:30/km' });
  });

  it('defaults typeSpecificData to { type: training_type } when absent', () => {
    const row = { ...baseRow, type_specific_data: null };
    const session = toSession(row);
    expect(session.typeSpecificData).toEqual({ type: 'run' });
  });

  it('preserves null values for nullable fields', () => {
    const nullRow: Record<string, unknown> = {
      ...baseRow,
      description: null,
      coach_comments: null,
      planned_duration_minutes: null,
      planned_distance_km: null,
      is_completed: false,
      completed_at: null,
      actual_duration_minutes: null,
      actual_distance_km: null,
      actual_pace: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      rpe: null,
      coach_post_feedback: null,
      trainee_notes: null,
      strava_activity_id: null,
      strava_synced_at: null,
    };
    const session = toSession(nullRow);
    expect(session.description).toBeNull();
    expect(session.coachComments).toBeNull();
    expect(session.plannedDurationMinutes).toBeNull();
    expect(session.plannedDistanceKm).toBeNull();
    expect(session.isCompleted).toBe(false);
    expect(session.completedAt).toBeNull();
    expect(session.actualDurationMinutes).toBeNull();
    expect(session.actualDistanceKm).toBeNull();
    expect(session.actualPace).toBeNull();
    expect(session.avgHeartRate).toBeNull();
    expect(session.maxHeartRate).toBeNull();
    expect(session.rpe).toBeNull();
    expect(session.coachPostFeedback).toBeNull();
    expect(session.athleteNotes).toBeNull();
    expect(session.stravaActivityId).toBeNull();
    expect(session.stravaSyncedAt).toBeNull();
  });
});

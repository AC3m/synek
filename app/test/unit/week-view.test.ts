import { groupSessionsByDay, computeWeekStats } from '~/lib/utils/week-view';
import { DAYS_OF_WEEK, type TrainingSession } from '~/types/training';

// ---------------------------------------------------------------------------
// Minimal session factory
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'session-1',
    weekPlanId: 'plan-1',
    dayOfWeek: 'monday',
    sortOrder: 0,
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: 60,
    plannedDistanceKm: 10,
    typeSpecificData: { type: 'run' },
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
    goalId: undefined,
    resultDistanceKm: undefined,
    resultTimeSeconds: undefined,
    resultPace: undefined,
    createdAt: '2026-03-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// groupSessionsByDay
// ---------------------------------------------------------------------------

describe('groupSessionsByDay', () => {
  it('initialises all 7 days as empty arrays even with no sessions', () => {
    const result = groupSessionsByDay([]);
    for (const day of DAYS_OF_WEEK) {
      expect(result[day]).toEqual([]);
    }
  });

  it('places sessions in the correct day bucket', () => {
    const session = makeSession({ dayOfWeek: 'wednesday' });
    const result = groupSessionsByDay([session]);
    expect(result.wednesday).toHaveLength(1);
    expect(result.wednesday[0].id).toBe('session-1');
    expect(result.monday).toHaveLength(0);
  });

  it('sorts sessions within a day by sortOrder ascending', () => {
    const sessions = [
      makeSession({ id: 'b', dayOfWeek: 'tuesday', sortOrder: 2 }),
      makeSession({ id: 'a', dayOfWeek: 'tuesday', sortOrder: 1 }),
      makeSession({ id: 'c', dayOfWeek: 'tuesday', sortOrder: 0 }),
    ];
    const result = groupSessionsByDay(sessions);
    expect(result.tuesday.map((s) => s.id)).toEqual(['c', 'a', 'b']);
  });

  it('handles multiple sessions across different days', () => {
    const sessions = [
      makeSession({ id: 'mon1', dayOfWeek: 'monday' }),
      makeSession({ id: 'wed1', dayOfWeek: 'wednesday' }),
      makeSession({ id: 'mon2', dayOfWeek: 'monday', sortOrder: 1 }),
    ];
    const result = groupSessionsByDay(sessions);
    expect(result.monday).toHaveLength(2);
    expect(result.wednesday).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// computeWeekStats
// ---------------------------------------------------------------------------

describe('computeWeekStats', () => {
  it('returns all-zero stats for an empty session list', () => {
    const stats = computeWeekStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.totalPlannedKm).toBe(0);
    expect(stats.completionPercentage).toBe(0);
  });

  it('counts totalSessions excluding rest_day type', () => {
    const sessions = [
      makeSession({ trainingType: 'run' }),
      makeSession({ id: 's2', trainingType: 'cycling' }),
      makeSession({ id: 's3', trainingType: 'rest_day' }),
    ];
    expect(computeWeekStats(sessions).totalSessions).toBe(2);
  });

  it('counts completedSessions excluding rest_day type', () => {
    const sessions = [
      makeSession({ trainingType: 'run', isCompleted: true }),
      makeSession({ id: 's2', trainingType: 'rest_day', isCompleted: true }),
    ];
    const stats = computeWeekStats(sessions);
    expect(stats.completedSessions).toBe(1);
  });

  it('computes completionPercentage as 100 when all non-rest sessions complete', () => {
    const sessions = [
      makeSession({ isCompleted: true }),
      makeSession({ id: 's2', trainingType: 'cycling', isCompleted: true }),
    ];
    expect(computeWeekStats(sessions).completionPercentage).toBe(100);
  });

  it('computes completionPercentage as 50 for half completed', () => {
    const sessions = [
      makeSession({ isCompleted: true }),
      makeSession({ id: 's2', isCompleted: false }),
    ];
    expect(computeWeekStats(sessions).completionPercentage).toBe(50);
  });

  it('sums totalPlannedKm across all sessions (including rest_day)', () => {
    const sessions = [
      makeSession({ plannedDistanceKm: 10 }),
      makeSession({ id: 's2', plannedDistanceKm: 5, trainingType: 'rest_day' }),
    ];
    expect(computeWeekStats(sessions).totalPlannedKm).toBe(15);
  });

  it('sums totalActualDistanceKm across all sports', () => {
    const sessions = [
      makeSession({ trainingType: 'run', actualDistanceKm: 9 }),
      makeSession({
        id: 's2',
        trainingType: 'cycling',
        actualDistanceKm: 30,
      }),
    ];
    expect(computeWeekStats(sessions).totalActualDistanceKm).toBe(39);
  });

  it('treats null plannedDistanceKm as 0 in totals', () => {
    const sessions = [
      makeSession({ plannedDistanceKm: null }),
      makeSession({ id: 's2', plannedDistanceKm: 10 }),
    ];
    expect(computeWeekStats(sessions).totalPlannedKm).toBe(10);
  });

  it('excludes sessions with goalId from totals and counts', () => {
    const sessions = [
      makeSession({ id: 's1', trainingType: 'run', plannedDistanceKm: 10, isCompleted: true }),
      makeSession({ id: 's2', trainingType: 'run', plannedDistanceKm: 5, goalId: 'goal-1' }),
      makeSession({
        id: 's3',
        trainingType: 'cycling',
        plannedDistanceKm: 20,
        goalId: 'goal-2',
        isCompleted: true,
      }),
    ];
    const stats = computeWeekStats(sessions);
    // Only s1 counts — s2 and s3 have goalId and are excluded
    expect(stats.totalSessions).toBe(1);
    expect(stats.completedSessions).toBe(1);
    expect(stats.totalPlannedKm).toBe(10);
    expect(stats.completionPercentage).toBe(100);
  });
});

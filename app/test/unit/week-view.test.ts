import { groupSessionsByDay, computeWeekStats, augmentSessionsWithGarmin } from '~/lib/utils/week-view';
import { DAYS_OF_WEEK, type TrainingSession } from '~/types/training';
import type { JunctionPocWorkout } from '~/types/junction-poc';

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

// ---------------------------------------------------------------------------
// augmentSessionsWithGarmin
// ---------------------------------------------------------------------------

// weekStart for a Monday 2026-04-07 week
const WEEK_START = '2026-04-07';

function makeWorkout(overrides: Partial<JunctionPocWorkout> = {}): JunctionPocWorkout {
  return {
    id: 'workout-1',
    appUserId: 'user-1',
    junctionWorkoutId: 'jw-1',
    title: null,
    sportSlug: 'cycling',
    calendarDate: '2026-04-07', // monday
    movingTimeSeconds: 2880, // 48 min
    distanceMeters: 19330,
    calories: 554,
    averageHr: 121,
    maxHr: 152,
    averageSpeed: null,
    ...overrides,
  };
}

describe('augmentSessionsWithGarmin', () => {
  it('returns sessions unchanged when no garmin workouts provided', () => {
    const session = makeSession({ trainingType: 'cycling' });
    const result = augmentSessionsWithGarmin([session], [], WEEK_START);
    expect(result[0].actualDurationMinutes).toBeNull();
  });

  it('back-fills a single session from a matching workout', () => {
    const session = makeSession({ trainingType: 'cycling', plannedDurationMinutes: 45 });
    const workout = makeWorkout({ movingTimeSeconds: 2880, distanceMeters: 19330 });
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].actualDurationMinutes).toBe(48);
    expect(result[0].actualDistanceKm).toBe(19.33);
  });

  it('does not override sessions that already have actual data', () => {
    const session = makeSession({
      trainingType: 'cycling',
      actualDurationMinutes: 60,
      actualDistanceKm: 25,
    });
    const workout = makeWorkout();
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].actualDurationMinutes).toBe(60);
    expect(result[0].actualDistanceKm).toBe(25);
  });

  it('assigns distinct workouts to two sessions of the same type on the same day (bug #65)', () => {
    const sessionA = makeSession({
      id: 'session-a',
      trainingType: 'cycling',
      plannedDurationMinutes: 65,
    });
    const sessionB = makeSession({
      id: 'session-b',
      trainingType: 'cycling',
      plannedDurationMinutes: 45,
    });
    // Two distinct rides: 64 min (closer to A) and 47 min (closer to B)
    const workoutLong = makeWorkout({ id: 'w-long', movingTimeSeconds: 3840, distanceMeters: 28070 }); // 64 min
    const workoutShort = makeWorkout({ id: 'w-short', movingTimeSeconds: 2820, distanceMeters: 19330 }); // 47 min

    const result = augmentSessionsWithGarmin(
      [sessionA, sessionB],
      [workoutLong, workoutShort],
      WEEK_START,
    );

    const resultA = result.find((s) => s.id === 'session-a')!;
    const resultB = result.find((s) => s.id === 'session-b')!;

    // Each session gets a distinct workout
    expect(resultA.actualDurationMinutes).toBe(64);
    expect(resultB.actualDurationMinutes).toBe(47);
  });

  it('leaves a session unmatched when workouts are exhausted', () => {
    const sessionA = makeSession({ id: 'session-a', trainingType: 'cycling', plannedDurationMinutes: 60 });
    const sessionB = makeSession({ id: 'session-b', trainingType: 'cycling', plannedDurationMinutes: 45 });
    // Only one workout available — second session stays unmatched
    const workout = makeWorkout({ id: 'w-only', movingTimeSeconds: 3600 });

    const result = augmentSessionsWithGarmin([sessionA, sessionB], [workout], WEEK_START);

    const matched = result.filter((s) => s.actualDurationMinutes !== null);
    const unmatched = result.filter((s) => s.actualDurationMinutes === null);
    expect(matched).toHaveLength(1);
    expect(unmatched).toHaveLength(1);
  });

  it('does not match a workout from a different day', () => {
    const session = makeSession({ trainingType: 'cycling', dayOfWeek: 'monday' });
    const workout = makeWorkout({ calendarDate: '2026-04-08' }); // tuesday
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].actualDurationMinutes).toBeNull();
  });

  it('does not match a workout from a different sport type', () => {
    const session = makeSession({ trainingType: 'run' });
    const workout = makeWorkout({ sportSlug: 'cycling' });
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].actualDurationMinutes).toBeNull();
  });

  it('skips workouts with null sportSlug', () => {
    const session = makeSession({ trainingType: 'cycling' });
    const workout = makeWorkout({ sportSlug: null });
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].actualDurationMinutes).toBeNull();
  });

  it('preserves existing calories and does not overwrite with garmin data', () => {
    const session = makeSession({ trainingType: 'cycling', calories: 400 });
    const workout = makeWorkout({ calories: 600 });
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].calories).toBe(400);
  });

  it('back-fills calories from garmin when session has none', () => {
    const session = makeSession({ trainingType: 'cycling', calories: null });
    const workout = makeWorkout({ calories: 554 });
    const result = augmentSessionsWithGarmin([session], [workout], WEEK_START);
    expect(result[0].calories).toBe(554);
  });
});

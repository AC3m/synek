import { computeDragResult } from '~/lib/utils/week-view';
import { DAYS_OF_WEEK, type SessionsByDay, type TrainingSession } from '~/types/training';

function makeSession(
  id: string,
  day: TrainingSession['dayOfWeek'],
  sortOrder: number,
): TrainingSession {
  return {
    id,
    weekPlanId: 'wp-1',
    dayOfWeek: day,
    sortOrder,
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: null,
    plannedDistanceKm: null,
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const emptyWeek: SessionsByDay = DAYS_OF_WEEK.reduce(
  (acc, d) => ({ ...acc, [d]: [] }),
  {} as SessionsByDay,
);

describe('computeDragResult', () => {
  it('returns null when over is null (drop cancelled)', () => {
    const sessionsByDay = {
      ...emptyWeek,
      monday: [makeSession('s1', 'monday', 0)],
    };
    const result = computeDragResult('s1', 'monday', null, sessionsByDay);
    expect(result).toBeNull();
  });

  it('returns ReorderSessionInput with overDay when dropped on a different day', () => {
    const sessionsByDay = {
      ...emptyWeek,
      monday: [makeSession('s1', 'monday', 0)],
      thursday: [makeSession('s2', 'thursday', 0)],
    };
    const result = computeDragResult('s1', 'monday', 'thursday', sessionsByDay);
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe('s1');
    expect(result!.dayOfWeek).toBe('thursday');
    // Appended after existing thursday sessions → sortOrder = 1
    expect(result!.sortOrder).toBe(1);
  });

  it('appends at end when target day is empty', () => {
    const sessionsByDay = {
      ...emptyWeek,
      monday: [makeSession('s1', 'monday', 0)],
    };
    const result = computeDragResult('s1', 'monday', 'wednesday', sessionsByDay);
    expect(result!.dayOfWeek).toBe('wednesday');
    expect(result!.sortOrder).toBe(0);
  });

  it('returns same dayOfWeek for within-day reorder', () => {
    const sessionsByDay = {
      ...emptyWeek,
      monday: [
        makeSession('s1', 'monday', 0),
        makeSession('s2', 'monday', 1),
        makeSession('s3', 'monday', 2),
      ],
    };
    const result = computeDragResult('s1', 'monday', 'monday', sessionsByDay);
    expect(result!.dayOfWeek).toBe('monday');
    expect(typeof result!.sortOrder).toBe('number');
  });
});

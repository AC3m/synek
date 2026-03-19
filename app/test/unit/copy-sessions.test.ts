import { resetMockSessions } from '~/lib/mock-data/sessions';
import {
  mockCopyWeekSessions,
  mockCopyDaySessions,
  mockFetchSessionsByWeekPlan,
} from '~/lib/mock-data/sessions';
import { buildCopySessionInput } from '~/lib/utils/session-copy';
import type { TrainingSession } from '~/types/training';

beforeEach(() => {
  resetMockSessions();
});

describe('buildCopySessionInput', () => {
  const fullSession: TrainingSession = {
    id: 'session-full',
    weekPlanId: 'wp-source',
    dayOfWeek: 'monday',
    sortOrder: 2,
    trainingType: 'run',
    description: 'Easy run',
    coachComments: 'Keep HR low',
    plannedDurationMinutes: 45,
    plannedDistanceKm: 8,
    typeSpecificData: { type: 'run', pace_target: '6:00/km', hr_zone: 2, terrain: 'road' },
    // actual / strava / athlete fields — these must NOT appear in the copy input
    isCompleted: true,
    completedAt: '2026-03-02T08:00:00Z',
    actualDurationMinutes: 48,
    actualDistanceKm: 8.2,
    actualPace: '5:51/km',
    avgHeartRate: 138,
    maxHeartRate: 155,
    rpe: 6,
    coachPostFeedback: 'Great effort!',
    athleteNotes: 'Felt good',
    stravaActivityId: 12345,
    stravaSyncedAt: '2026-03-02T09:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('builds a CreateSessionInput with only planned fields', () => {
    const input = buildCopySessionInput(fullSession, 'wp-target', 'thursday');
    expect(input.weekPlanId).toBe('wp-target');
    expect(input.dayOfWeek).toBe('thursday');
    expect(input.trainingType).toBe('run');
    expect(input.description).toBe('Easy run');
    expect(input.coachComments).toBe('Keep HR low');
    expect(input.plannedDurationMinutes).toBe(45);
    expect(input.plannedDistanceKm).toBe(8);
    expect(input.typeSpecificData).toEqual(fullSession.typeSpecificData);
  });

  it('omits actual/strava/athlete fields', () => {
    const input = buildCopySessionInput(fullSession, 'wp-target', 'thursday');
    expect((input as unknown as Record<string, unknown>).isCompleted).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).completedAt).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).actualDurationMinutes).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).actualDistanceKm).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).actualPace).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).avgHeartRate).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).maxHeartRate).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).rpe).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).coachPostFeedback).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).athleteNotes).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).stravaActivityId).toBeUndefined();
    expect((input as unknown as Record<string, unknown>).stravaSyncedAt).toBeUndefined();
  });
});

describe('mockCopyWeekSessions', () => {
  it('copies sessions from source week to target week', async () => {
    // W09 has 7 sessions, copy all to a new target week plan
    const count = await mockCopyWeekSessions({
      sourceWeekPlanId: 'wp-w09-a1',
      targetWeekPlanId: 'wp-target',
    });

    expect(count).toBeGreaterThan(0);
    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    expect(copied).toHaveLength(count);
  });

  it('copied sessions contain only planned fields', async () => {
    await mockCopyWeekSessions({
      sourceWeekPlanId: 'wp-w09-a1',
      targetWeekPlanId: 'wp-target',
    });

    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    for (const s of copied) {
      // planned fields should be present
      expect(s.trainingType).toBeDefined();
      expect(s.typeSpecificData).toBeDefined();

      // actual/athlete/strava fields must be absent (null)
      expect(s.isCompleted).toBe(false);
      expect(s.completedAt).toBeNull();
      expect(s.actualDurationMinutes).toBeNull();
      expect(s.actualDistanceKm).toBeNull();
      expect(s.actualPace).toBeNull();
      expect(s.avgHeartRate).toBeNull();
      expect(s.maxHeartRate).toBeNull();
      expect(s.rpe).toBeNull();
      expect(s.athleteNotes).toBeNull();
      expect(s.coachPostFeedback).toBeNull();
      expect(s.stravaActivityId).toBeNull();
      expect(s.stravaSyncedAt).toBeNull();
    }
  });

  it('returns the correct count of copied sessions', async () => {
    const count = await mockCopyWeekSessions({
      sourceWeekPlanId: 'wp-w09-a1',
      targetWeekPlanId: 'wp-target',
    });

    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    expect(count).toBe(copied.length);
  });

  it('returns 0 when source week has no sessions', async () => {
    const count = await mockCopyWeekSessions({
      sourceWeekPlanId: 'wp-nonexistent',
      targetWeekPlanId: 'wp-target',
    });

    expect(count).toBe(0);
    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    expect(copied).toHaveLength(0);
  });
});

describe('mockCopyDaySessions', () => {
  it('copies only sessions from the specified source day', async () => {
    const count = await mockCopyDaySessions({
      sourceWeekPlanId: 'wp-w09-a1',
      sourceDay: 'monday',
      targetWeekPlanId: 'wp-target',
      targetDay: 'monday',
    });

    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    expect(count).toBe(1); // W09 monday has exactly 1 session
    expect(copied).toHaveLength(1);
    expect(copied[0].dayOfWeek).toBe('monday');
  });

  it('places copied sessions in the target day', async () => {
    await mockCopyDaySessions({
      sourceWeekPlanId: 'wp-w09-a1',
      sourceDay: 'monday',
      targetWeekPlanId: 'wp-target',
      targetDay: 'thursday',
    });

    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    expect(copied[0].dayOfWeek).toBe('thursday');
  });

  it('copied day sessions contain only planned fields', async () => {
    await mockCopyDaySessions({
      sourceWeekPlanId: 'wp-w09-a1',
      sourceDay: 'monday',
      targetWeekPlanId: 'wp-target',
      targetDay: 'monday',
    });

    const copied = await mockFetchSessionsByWeekPlan('wp-target');
    const s = copied[0];
    expect(s.isCompleted).toBe(false);
    expect(s.completedAt).toBeNull();
    expect(s.actualDurationMinutes).toBeNull();
    expect(s.athleteNotes).toBeNull();
    expect(s.coachPostFeedback).toBeNull();
    expect(s.stravaActivityId).toBeNull();
  });

  it('returns 0 when source day has no sessions', async () => {
    // W09 has no sunday sessions in the easy-run athlete-1 data? Actually it does (cycling)
    // Use a non-existent week plan instead
    const count = await mockCopyDaySessions({
      sourceWeekPlanId: 'wp-nonexistent',
      sourceDay: 'monday',
      targetWeekPlanId: 'wp-target',
      targetDay: 'monday',
    });

    expect(count).toBe(0);
  });
});

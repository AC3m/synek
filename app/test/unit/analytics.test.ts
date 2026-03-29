import { describe, expect, it, vi } from 'vitest';
import { computeSportBreakdown } from '~/lib/utils/analytics';
import type { TrainingSession } from '~/types/training';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<TrainingSession>): TrainingSession {
  return {
    id: 'session-' + Math.random(),
    weekPlanId: 'wp-1',
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
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    goalId: null,
    resultDistanceKm: null,
    resultTimeSeconds: null,
    resultPace: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const RUN_SESSION = makeSession({ id: 's-run-1', trainingType: 'run', plannedDistanceKm: 10, plannedDurationMinutes: 60 });
const RUN_SESSION_2 = makeSession({ id: 's-run-2', trainingType: 'run', plannedDistanceKm: 5, plannedDurationMinutes: 30, actualDistanceKm: 5.2, actualDurationMinutes: 28 });
const CYCLING_SESSION = makeSession({ id: 's-cyc-1', trainingType: 'cycling', plannedDistanceKm: 40, plannedDurationMinutes: 90 });
const COMPETITION_SESSION = makeSession({
  id: 's-comp-1',
  trainingType: 'run',
  goalId: 'goal-1',
  plannedDistanceKm: 10,
  plannedDurationMinutes: 50,
  resultDistanceKm: 10,
  resultTimeSeconds: 2880,
});

// ---------------------------------------------------------------------------
// computeSportBreakdown
// ---------------------------------------------------------------------------

describe('computeSportBreakdown', () => {
  it('(a) groups training sessions by trainingType summing distances and counting sessions', () => {
    const result = computeSportBreakdown([RUN_SESSION, RUN_SESSION_2, CYCLING_SESSION]);

    expect(result.byType.run).toBeDefined();
    expect(result.byType.run!.sessionCount).toBe(2);
    expect(result.byType.run!.plannedDistanceKm).toBe(15); // 10 + 5
    expect(result.byType.run!.totalDurationMinutes).toBe(88); // RUN_SESSION: 60 planned + RUN_SESSION_2: 28 actual

    expect(result.byType.cycling).toBeDefined();
    expect(result.byType.cycling!.sessionCount).toBe(1);
    expect(result.byType.cycling!.plannedDistanceKm).toBe(40);
  });

  it('(b) sessions with goalId set are excluded from byType and collected in competitionSessions', () => {
    const result = computeSportBreakdown([RUN_SESSION, COMPETITION_SESSION]);

    // Competition excluded from run byType
    expect(result.byType.run?.sessionCount).toBe(1);
    // Competition session is in the competitions array
    expect(result.competitionSessions).toHaveLength(1);
    expect(result.competitionSessions[0].sessionId).toBe('s-comp-1');
    expect(result.competitionSessions[0].goalId).toBe('goal-1');
  });

  it('(c) achievementStatus on competition summary is derived correctly (goal has no targets → pending)', () => {
    const result = computeSportBreakdown([COMPETITION_SESSION]);
    // Competition session has result but its goal has no targets (we only have session data here)
    expect(result.competitionSessions[0].achievementStatus).toBe('pending');
  });

  it('(d) empty array returns empty byType and empty competitionSessions', () => {
    const result = computeSportBreakdown([]);
    expect(Object.keys(result.byType)).toHaveLength(0);
    expect(result.competitionSessions).toHaveLength(0);
  });

  it('(e) week with only competition sessions returns empty byType', () => {
    const result = computeSportBreakdown([COMPETITION_SESSION]);
    expect(Object.keys(result.byType)).toHaveLength(0);
    expect(result.competitionSessions).toHaveLength(1);
  });

  it('uses actual distance/duration when completed, planned when not', () => {
    const result = computeSportBreakdown([RUN_SESSION, RUN_SESSION_2]);
    // RUN_SESSION: not completed, no actual → uses planned (10km, 60min)
    // RUN_SESSION_2: has actual values → uses actual (5.2km, 28min)
    expect(result.byType.run!.actualDistanceKm).toBeCloseTo(5.2);
    expect(result.byType.run!.totalDurationMinutes).toBe(88); // 60 + 28
  });
});

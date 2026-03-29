import { describe, expect, it } from 'vitest';
import {
  computeGoalAchievement,
  getPrepWeekRange,
  isWeekInPrepWindow,
  isCompetitionWeek,
} from '~/lib/utils/goals';
import type { Goal } from '~/types/training';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseGoal: Goal = {
  id: 'g-1',
  athleteId: 'a-1',
  createdBy: 'c-1',
  name: 'Spring 10K',
  discipline: 'run',
  competitionDate: '2026-05-23', // Saturday
  preparationWeeks: 4,
  goalDistanceKm: 10,
  goalTimeSeconds: 3000,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// computeGoalAchievement
// ---------------------------------------------------------------------------

describe('computeGoalAchievement', () => {
  it('(a) returns pending when session has no result', () => {
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: null, resultTimeSeconds: null }),
    ).toBe('pending');
  });

  it('(b) returns achieved when resultDistanceKm >= goalDistanceKm', () => {
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: 10, resultTimeSeconds: null }),
    ).toBe('achieved');
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: 10.5, resultTimeSeconds: null }),
    ).toBe('achieved');
  });

  it('(c) returns missed when resultDistanceKm < goalDistanceKm', () => {
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: 9.5, resultTimeSeconds: null }),
    ).toBe('missed');
  });

  it('(d) returns achieved when resultTimeSeconds <= goalTimeSeconds', () => {
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: null, resultTimeSeconds: 2880 }),
    ).toBe('achieved');
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: null, resultTimeSeconds: 3000 }),
    ).toBe('achieved');
  });

  it('(e) returns missed when resultTimeSeconds > goalTimeSeconds', () => {
    expect(
      computeGoalAchievement(baseGoal, { resultDistanceKm: null, resultTimeSeconds: 3120 }),
    ).toBe('missed');
  });

  it('(f) returns pending when goal has no target set and result exists', () => {
    const noTargetGoal: Goal = {
      ...baseGoal,
      goalDistanceKm: null,
      goalTimeSeconds: null,
    };
    expect(
      computeGoalAchievement(noTargetGoal, { resultDistanceKm: 10, resultTimeSeconds: 2880 }),
    ).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// isWeekInPrepWindow
// ---------------------------------------------------------------------------

describe('isWeekInPrepWindow', () => {
  // competitionDate: 2026-05-23 (Saturday), preparationWeeks: 4
  // 4 weeks back from Saturday 2026-05-23 = Monday 2026-04-27
  // Prep window covers weeks starting: 2026-04-27, 2026-05-04, 2026-05-11, 2026-05-18
  // Competition week starts: 2026-05-18

  it('(g) returns true for a week inside the prep window', () => {
    expect(isWeekInPrepWindow('2026-04-20', baseGoal)).toBe(true);
    expect(isWeekInPrepWindow('2026-04-27', baseGoal)).toBe(true);
    expect(isWeekInPrepWindow('2026-05-04', baseGoal)).toBe(true);
    expect(isWeekInPrepWindow('2026-05-11', baseGoal)).toBe(true);
  });

  it('(h) returns false for the competition week itself', () => {
    // Competition is on Saturday 2026-05-23, week starts Monday 2026-05-18
    expect(isWeekInPrepWindow('2026-05-18', baseGoal)).toBe(false);
  });

  it('(i) returns false for a week after the competition', () => {
    expect(isWeekInPrepWindow('2026-05-25', baseGoal)).toBe(false);
  });

  it('(j) returns false when preparationWeeks is 0', () => {
    const zeroPrep: Goal = { ...baseGoal, preparationWeeks: 0 };
    expect(isWeekInPrepWindow('2026-05-18', zeroPrep)).toBe(false);
    expect(isWeekInPrepWindow('2026-05-11', zeroPrep)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPrepWeekRange
// ---------------------------------------------------------------------------

describe('getPrepWeekRange', () => {
  it('(k) start is Monday of week N − preparationWeeks, end is competitionDate', () => {
    const range = getPrepWeekRange(baseGoal);
    // 4 weeks back from 2026-05-23 (Sat) → 2026-04-25 (Sat); align back to Monday → 2026-04-20
    expect(range.start).toBe('2026-04-20');
    expect(range.end).toBe('2026-05-23');
  });

  it('(l) start equals end when preparationWeeks is 0', () => {
    const noPrep: Goal = { ...baseGoal, preparationWeeks: 0 };
    const range = getPrepWeekRange(noPrep);
    expect(range.start).toBe('2026-05-23');
    expect(range.end).toBe('2026-05-23');
  });
});

// ---------------------------------------------------------------------------
// isCompetitionWeek
// ---------------------------------------------------------------------------

describe('isCompetitionWeek', () => {
  // competitionDate: 2026-05-23 (Saturday) → competition week Monday: 2026-05-18

  it('(m) returns true when weekStart matches the competition date Monday', () => {
    expect(isCompetitionWeek('2026-05-18', baseGoal)).toBe(true);
  });

  it('(n) returns false for prep weeks before the competition week', () => {
    expect(isCompetitionWeek('2026-05-11', baseGoal)).toBe(false);
    expect(isCompetitionWeek('2026-04-27', baseGoal)).toBe(false);
  });

  it('(o) returns false for weeks after the competition', () => {
    expect(isCompetitionWeek('2026-05-25', baseGoal)).toBe(false);
    expect(isCompetitionWeek('2026-06-01', baseGoal)).toBe(false);
  });
});

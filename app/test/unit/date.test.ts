import {
  getCurrentWeekId,
  weekIdToMonday,
  mondayToWeekId,
  getNextWeekId,
  getPrevWeekId,
  getWeekDateRange,
  parseWeekId,
} from '~/lib/utils/date';

describe('getCurrentWeekId', () => {
  it('returns a string matching YYYY-WNN format', () => {
    const result = getCurrentWeekId();
    expect(result).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('contains a valid week number (01–53)', () => {
    const result = getCurrentWeekId();
    const week = parseInt(result.split('-W')[1], 10);
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });
});

describe('weekIdToMonday', () => {
  it('returns the correct Monday for a known week', () => {
    // 2026-W10 starts on Monday 2026-03-02
    expect(weekIdToMonday('2026-W10')).toBe('2026-03-02');
  });

  it('returns correct Monday for week 1', () => {
    // ISO week 1 of 2026 starts on Monday 2025-12-29
    expect(weekIdToMonday('2026-W01')).toBe('2025-12-29');
  });

  it('handles zero-padded week numbers', () => {
    expect(weekIdToMonday('2026-W09')).toBe('2026-02-23');
  });

  it('throws on invalid week ID format', () => {
    expect(() => weekIdToMonday('2026-10')).toThrow('Invalid week ID');
    expect(() => weekIdToMonday('bad-input')).toThrow('Invalid week ID');
    expect(() => weekIdToMonday('')).toThrow('Invalid week ID');
  });
});

describe('mondayToWeekId', () => {
  it('converts a known Monday date string to the correct week ID', () => {
    expect(mondayToWeekId('2026-03-02')).toBe('2026-W10');
  });

  it('is the inverse of weekIdToMonday', () => {
    const weekId = '2026-W23';
    expect(mondayToWeekId(weekIdToMonday(weekId))).toBe(weekId);
  });

  it('handles the year-boundary ISO week (week 1 starting in prev year)', () => {
    // 2025-12-29 is the Monday of 2026-W01
    expect(mondayToWeekId('2025-12-29')).toBe('2026-W01');
  });
});

describe('getNextWeekId', () => {
  it('returns the following week ID', () => {
    expect(getNextWeekId('2026-W10')).toBe('2026-W11');
  });

  it('crosses year boundary correctly (last week → week 1 of next year)', () => {
    // 2026-W53 does not exist; last week of 2026 is W52 or W53
    // Use a known boundary: 2015 has 53 weeks
    expect(getNextWeekId('2015-W53')).toBe('2016-W01');
  });
});

describe('getPrevWeekId', () => {
  it('returns the previous week ID', () => {
    expect(getPrevWeekId('2026-W10')).toBe('2026-W09');
  });

  it('crosses year boundary correctly (week 1 → last week of previous year)', () => {
    expect(getPrevWeekId('2026-W01')).toBe('2025-W52');
  });
});

describe('getWeekDateRange', () => {
  it('returns the correct start (Monday) and end (Sunday) for a known week', () => {
    const result = getWeekDateRange('2026-W10');
    // 2026-W10: Mon 2026-03-02 → Sun 2026-03-08
    expect(result.start.getFullYear()).toBe(2026);
    expect(result.start.getMonth()).toBe(2); // March (0-indexed)
    expect(result.start.getDate()).toBe(2);
    expect(result.end.getDate()).toBe(8);
  });

  it('returns a non-empty formatted string', () => {
    const result = getWeekDateRange('2026-W10');
    expect(result.formatted).toBeTruthy();
    expect(typeof result.formatted).toBe('string');
  });

  it('end falls on Sunday (day 0 in getDay())', () => {
    // endOfISOWeek returns end-of-Sunday (23:59:59.999) so we check the day index
    const result = getWeekDateRange('2026-W10');
    expect(result.end.getDay()).toBe(0); // 0 = Sunday
  });
});

describe('parseWeekId', () => {
  it('returns correct year and weekNumber', () => {
    expect(parseWeekId('2026-W10')).toEqual({ year: 2026, weekNumber: 10 });
  });

  it('parses single-digit weeks with leading zero', () => {
    expect(parseWeekId('2026-W01')).toEqual({ year: 2026, weekNumber: 1 });
  });

  it('throws on invalid format', () => {
    expect(() => parseWeekId('bad')).toThrow('Invalid week ID');
  });
});

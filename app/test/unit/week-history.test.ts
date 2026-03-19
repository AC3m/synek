import { computePreviousWeekIds } from '~/lib/utils/date';

describe('computePreviousWeekIds', () => {
  it('returns N previous week IDs in descending order (most recent first)', () => {
    const result = computePreviousWeekIds('2026-W13', 4);
    expect(result).toEqual(['2026-W12', '2026-W11', '2026-W10', '2026-W09']);
  });

  it('returns 1 previous week when count is 1', () => {
    const result = computePreviousWeekIds('2026-W13', 1);
    expect(result).toEqual(['2026-W12']);
  });

  it('returns empty array when count is 0', () => {
    const result = computePreviousWeekIds('2026-W13', 0);
    expect(result).toEqual([]);
  });

  it('wraps correctly across year boundary — W01 → previous year W52/W53', () => {
    const result = computePreviousWeekIds('2026-W01', 2);
    // 2025 had 52 weeks; W01-1 = 2025-W52
    expect(result[0]).toBe('2025-W52');
    expect(result[1]).toBe('2025-W51');
  });

  it('handles mid-year correctly', () => {
    const result = computePreviousWeekIds('2026-W06', 3);
    expect(result).toEqual(['2026-W05', '2026-W04', '2026-W03']);
  });
});

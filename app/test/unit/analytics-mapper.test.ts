import { describe, it, expect } from 'vitest';
import { toAnalyticsBucket } from '~/lib/queries/analytics';

describe('toAnalyticsBucket mapper', () => {
  it('(a) maps snake_case DB row to AnalyticsBucket', () => {
    const row = {
      label: 'Mar',
      start_date: '2026-03-01',
      end_date: '2026-03-31',
      total_sessions: 10,
      completed_sessions: 8,
      total_distance_km: 72.5,
      total_duration_minutes: 540,
      completion_rate: 80.0,
    };
    const bucket = toAnalyticsBucket(row);
    expect(bucket.label).toBe('Mar');
    expect(bucket.startDate).toBe('2026-03-01');
    expect(bucket.endDate).toBe('2026-03-31');
    expect(bucket.totalSessions).toBe(10);
    expect(bucket.completedSessions).toBe(8);
    expect(bucket.totalDistanceKm).toBe(72.5);
    expect(bucket.totalDurationMinutes).toBe(540);
    expect(bucket.completionRate).toBe(80.0);
  });

  it('(b) defaults null distance and duration to zero', () => {
    const row = {
      label: 'W01',
      start_date: '2026-01-01',
      end_date: '2026-01-07',
      total_sessions: 0,
      completed_sessions: 0,
      total_distance_km: null,
      total_duration_minutes: null,
      completion_rate: 0,
    };
    const bucket = toAnalyticsBucket(row);
    expect(bucket.totalDistanceKm).toBe(0);
    expect(bucket.totalDurationMinutes).toBe(0);
  });

  it('(c) preserves numeric precision for distance', () => {
    const row = {
      label: 'Q1',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      total_sessions: 36,
      completed_sessions: 30,
      total_distance_km: 255.75,
      total_duration_minutes: 1800,
      completion_rate: 83.3,
    };
    const bucket = toAnalyticsBucket(row);
    expect(bucket.totalDistanceKm).toBe(255.75);
    expect(bucket.completionRate).toBe(83.3);
  });
});

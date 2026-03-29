import type { AnalyticsParams, AnalyticsResponse, AnalyticsBucket } from '~/types/training';
import { delay } from './_shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBucket(
  label: string,
  startDate: string,
  endDate: string,
  totalSessions: number,
  completedSessions: number,
  totalDistanceKm: number,
  totalDurationMinutes: number,
): AnalyticsBucket {
  return {
    label,
    startDate,
    endDate,
    totalSessions,
    completedSessions,
    totalDistanceKm,
    totalDurationMinutes,
    completionRate:
      totalSessions === 0 ? 0 : Math.round((completedSessions / totalSessions) * 1000) / 10,
  };
}

// ---------------------------------------------------------------------------
// Mock responses per period type
// ---------------------------------------------------------------------------

const YEAR_RESPONSE: AnalyticsResponse = {
  buckets: [
    makeBucket('Jan', '2026-01-01', '2026-01-31', 10, 9, 72, 540),
    makeBucket('Feb', '2026-02-01', '2026-02-28', 12, 10, 85, 620),
    makeBucket('Mar', '2026-03-01', '2026-03-31', 14, 11, 98, 710),
    makeBucket('Apr', '2026-04-01', '2026-04-30', 12, 10, 80, 600),
    makeBucket('May', '2026-05-01', '2026-05-31', 10, 8, 65, 480),
    makeBucket('Jun', '2026-06-01', '2026-06-30', 0, 0, 0, 0),
    makeBucket('Jul', '2026-07-01', '2026-07-31', 0, 0, 0, 0),
    makeBucket('Aug', '2026-08-01', '2026-08-31', 0, 0, 0, 0),
    makeBucket('Sep', '2026-09-01', '2026-09-30', 0, 0, 0, 0),
    makeBucket('Oct', '2026-10-01', '2026-10-31', 0, 0, 0, 0),
    makeBucket('Nov', '2026-11-01', '2026-11-30', 0, 0, 0, 0),
    makeBucket('Dec', '2026-12-01', '2026-12-31', 0, 0, 0, 0),
  ],
  competitions: [
    {
      goalId: 'goal-2',
      goalName: 'City Gran Fondo',
      discipline: 'cycling',
      competitionDate: '2026-02-14',
      goalDistanceKm: 100,
      goalTimeSeconds: 14400,
      resultDistanceKm: 102,
      resultTimeSeconds: 13860,
      achievementStatus: 'achieved',
    },
    {
      goalId: 'goal-1',
      goalName: 'Spring 10K',
      discipline: 'run',
      competitionDate: '2026-05-23',
      goalDistanceKm: 10,
      goalTimeSeconds: 3000,
      resultDistanceKm: null,
      resultTimeSeconds: null,
      achievementStatus: 'pending',
    },
  ],
  totals: {
    totalSessions: 58,
    completedSessions: 48,
    totalDistanceKm: 400,
    totalDurationMinutes: 2950,
    overallCompletionRate: 82.8,
  },
};

const QUARTER_RESPONSE: AnalyticsResponse = {
  buckets: [
    makeBucket('W01', '2026-01-01', '2026-01-07', 3, 3, 22, 160),
    makeBucket('W02', '2026-01-08', '2026-01-14', 3, 2, 18, 130),
    makeBucket('W03', '2026-01-15', '2026-01-21', 3, 3, 24, 175),
    makeBucket('W04', '2026-01-22', '2026-01-28', 3, 1, 8, 60),
    makeBucket('W05', '2026-01-29', '2026-02-04', 3, 3, 22, 155),
    makeBucket('W06', '2026-02-05', '2026-02-11', 3, 3, 25, 180),
    makeBucket('W07', '2026-02-12', '2026-02-18', 3, 2, 15, 110),
    makeBucket('W08', '2026-02-19', '2026-02-25', 3, 3, 23, 165),
    makeBucket('W09', '2026-02-26', '2026-03-04', 4, 4, 30, 220),
    makeBucket('W10', '2026-03-05', '2026-03-11', 4, 2, 14, 100),
    makeBucket('W11', '2026-03-12', '2026-03-18', 4, 0, 0, 0),
    makeBucket('W12', '2026-03-19', '2026-03-25', 4, 0, 0, 0),
    makeBucket('W13', '2026-03-26', '2026-03-31', 3, 0, 0, 0),
  ],
  competitions: [
    {
      goalId: 'goal-2',
      goalName: 'City Gran Fondo',
      discipline: 'cycling',
      competitionDate: '2026-02-14',
      goalDistanceKm: 100,
      goalTimeSeconds: 14400,
      resultDistanceKm: 102,
      resultTimeSeconds: 13860,
      achievementStatus: 'achieved',
    },
  ],
  totals: {
    totalSessions: 40,
    completedSessions: 26,
    totalDistanceKm: 201,
    totalDurationMinutes: 1455,
    overallCompletionRate: 65.0,
  },
};

const MONTH_RESPONSE: AnalyticsResponse = {
  buckets: Array.from({ length: 28 }, (_, i) => {
    const d = i + 1;
    const date = `2026-03-${String(d).padStart(2, '0')}`;
    const hasSessions = d <= 10 && d % 2 === 0;
    return makeBucket(
      `${d} Mar`,
      date,
      date,
      hasSessions ? 1 : 0,
      hasSessions && d <= 6 ? 1 : 0,
      hasSessions ? 8 + d : 0,
      hasSessions ? 50 + d * 3 : 0,
    );
  }),
  competitions: [],
  totals: {
    totalSessions: 5,
    completedSessions: 3,
    totalDistanceKm: 45,
    totalDurationMinutes: 290,
    overallCompletionRate: 60.0,
  },
};

const GOAL_RESPONSE: AnalyticsResponse = {
  buckets: [
    makeBucket('W08', '2026-03-28', '2026-04-03', 4, 4, 35, 250),
    makeBucket('W09', '2026-04-04', '2026-04-10', 4, 3, 28, 200),
    makeBucket('W10', '2026-04-11', '2026-04-17', 5, 5, 42, 300),
    makeBucket('W11', '2026-04-18', '2026-04-24', 5, 4, 38, 270),
    makeBucket('W12', '2026-04-25', '2026-05-01', 5, 5, 45, 320),
    makeBucket('W13', '2026-05-02', '2026-05-08', 5, 3, 30, 210),
    makeBucket('W14', '2026-05-09', '2026-05-15', 4, 4, 25, 175),
    makeBucket('W15', '2026-05-16', '2026-05-23', 3, 0, 0, 0),
  ],
  competitions: [
    {
      goalId: 'goal-1',
      goalName: 'Spring 10K',
      discipline: 'run',
      competitionDate: '2026-05-23',
      goalDistanceKm: 10,
      goalTimeSeconds: 3000,
      resultDistanceKm: null,
      resultTimeSeconds: null,
      achievementStatus: 'pending',
    },
  ],
  totals: {
    totalSessions: 35,
    completedSessions: 28,
    totalDistanceKm: 243,
    totalDurationMinutes: 1725,
    overallCompletionRate: 80.0,
  },
};

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

export async function mockGetAnalytics(params: AnalyticsParams): Promise<AnalyticsResponse> {
  await delay();
  switch (params.period) {
    case 'year':
      return YEAR_RESPONSE;
    case 'quarter':
      return QUARTER_RESPONSE;
    case 'month':
      return MONTH_RESPONSE;
    case 'goal':
      return GOAL_RESPONSE;
    default:
      return MONTH_RESPONSE;
  }
}

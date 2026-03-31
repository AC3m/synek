import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '~/i18n/config';
import { WeekSummary } from '~/components/calendar/WeekSummary';
import type { WeekPlan, WeekStats } from '~/types/training';

const WEEK_PLAN: WeekPlan = {
  id: 'wp-1',
  athleteId: 'a-1',
  weekStart: '2026-03-23',
  year: 2026,
  weekNumber: 13,
  loadType: null,
  totalPlannedKm: null,
  description: null,
  actualTotalKm: null,
  coachComments: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const STATS_WITH_BREAKDOWN: WeekStats = {
  totalSessions: 3,
  completedSessions: 1,
  completionPercentage: 33,
  totalPlannedKm: 20,
  totalCompletedKm: 10,
  totalActualDistanceKm: 10,
  totalActualDurationMinutes: 90,
  totalCalories: 0,
  byType: {
    run: {
      sessionCount: 2,
      completedSessionCount: 1,
      plannedDistanceKm: 15,
      actualDistanceKm: 10,
      totalDurationMinutes: 60,
      totalCalories: 0,
    },
    cycling: {
      sessionCount: 1,
      completedSessionCount: 0,
      plannedDistanceKm: 5,
      actualDistanceKm: 0,
      totalDurationMinutes: 30,
      totalCalories: 0,
    },
  },
  competitionSessions: [],
};

const STATS_WITH_COMPETITION: WeekStats = {
  ...STATS_WITH_BREAKDOWN,
  competitionSessions: [
    {
      sessionId: 's-1',
      goalId: 'g-1',
      goalName: 'Spring 10K',
      discipline: 'run',
      goalDistanceKm: 10,
      resultDistanceKm: 9.8,
      resultTimeSeconds: 3000,
      actualDistanceKm: 9.8,
      actualDurationMinutes: 50,
      achievementStatus: 'achieved',
    },
  ],
};

const STATS_EMPTY: WeekStats = {
  totalSessions: 0,
  completedSessions: 0,
  completionPercentage: 0,
  totalPlannedKm: 0,
  totalCompletedKm: 0,
  totalActualDistanceKm: 0,
  totalActualDurationMinutes: 0,
  totalCalories: 0,
  byType: {},
  competitionSessions: [],
};

function renderSummary(stats: WeekStats, weekPlan = WEEK_PLAN) {
  return render(
    <I18nextProvider i18n={i18n}>
      <WeekSummary weekPlan={weekPlan} stats={stats} readonly={true} />
    </I18nextProvider>,
  );
}

describe('WeekSummary sport breakdown toggle', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('(a) shows cumulative view by default', () => {
    renderSummary(STATS_WITH_BREAKDOWN);
    expect(screen.getByTestId('cumulative-view')).toBeInTheDocument();
    // sport-breakdown is in DOM for animation, but opacity-0 (collapsed)
    expect(screen.getByTestId('sport-breakdown-view')).toHaveClass('opacity-0');
  });

  it('(b) renders toggle buttons for cumulative and by-sport views', () => {
    renderSummary(STATS_WITH_BREAKDOWN);
    expect(screen.getByTestId('view-cumulative')).toBeInTheDocument();
    expect(screen.getByTestId('view-by-sport')).toBeInTheDocument();
  });

  it('(c) switching to by-sport shows sport breakdown view', () => {
    renderSummary(STATS_WITH_BREAKDOWN);
    fireEvent.click(screen.getByTestId('view-by-sport'));
    expect(screen.getByTestId('sport-breakdown-view')).toHaveClass('opacity-100');
  });

  it('(d) switching back to cumulative hides sport breakdown', () => {
    renderSummary(STATS_WITH_BREAKDOWN);
    fireEvent.click(screen.getByTestId('view-by-sport'));
    fireEvent.click(screen.getByTestId('view-cumulative'));
    expect(screen.getByTestId('sport-breakdown-view')).toHaveClass('opacity-0');
    expect(screen.getByTestId('cumulative-view')).toHaveStyle({ gridTemplateRows: '1fr' });
  });

  it('(e) persists view preference to sessionStorage', () => {
    renderSummary(STATS_WITH_BREAKDOWN);
    fireEvent.click(screen.getByTestId('view-by-sport'));
    expect(sessionStorage.getItem('weekSummary.view')).toBe('by-sport');
  });

  it('(f) restores view from sessionStorage on mount', () => {
    sessionStorage.setItem('weekSummary.view', 'by-sport');
    renderSummary(STATS_WITH_BREAKDOWN);
    expect(screen.getByTestId('sport-breakdown-view')).toHaveClass('opacity-100');
    expect(screen.getByTestId('cumulative-view')).toHaveStyle({ gridTemplateRows: '0fr' });
  });

  it('(g) competition sessions appear in by-sport view', () => {
    renderSummary(STATS_WITH_COMPETITION);
    fireEvent.click(screen.getByTestId('view-by-sport'));
    expect(screen.getByText('Spring 10K')).toBeInTheDocument();
  });

  it('(h) shows empty state in by-sport when no sessions', () => {
    renderSummary(STATS_EMPTY);
    fireEvent.click(screen.getByTestId('view-by-sport'));
    expect(screen.getByTestId('sport-breakdown-view')).toBeInTheDocument();
    // SportBreakdown renders a "no sessions" message
    expect(screen.queryByTestId('sport-breakdown-view')).toBeInTheDocument();
  });
});

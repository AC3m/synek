import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '~/i18n/config';
import { HistoryWeekRow } from '~/components/calendar/HistoryWeekRow';
import type { WeekPlan, TrainingSession } from '~/types/training';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'coach-1', role: 'coach', name: 'Coach' },
  }),
}));

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return Wrapper;
}

const mockWeekPlan: WeekPlan = {
  id: 'wp-test',
  athleteId: 'athlete-1',
  weekStart: '2026-03-02',
  year: 2026,
  weekNumber: 10,
  loadType: 'medium',
  totalPlannedKm: 40,
  description: null,
  coachComments: null,
  actualTotalKm: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockSession: TrainingSession = {
  id: 'session-test-1',
  weekPlanId: 'wp-test',
  dayOfWeek: 'monday',
  sortOrder: 0,
  trainingType: 'run',
  description: 'Easy run',
  coachComments: null,
  plannedDurationMinutes: 30,
  plannedDistanceKm: 5,
  typeSpecificData: { type: 'run' },
  isCompleted: true,
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

describe('HistoryWeekRow', () => {
  const defaultProps = {
    weekId: '2026-W10',
    weekPlan: mockWeekPlan,
    sessions: [mockSession],
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onCopyWeek: vi.fn(),
    onCopyDay: vi.fn(),
    onCopySession: vi.fn(),
    targetWeekPlanId: 'wp-current',
  };

  it('renders week label and session count in collapsed state', () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} />
      </Wrapper>,
    );
    // Week number should be visible (EN: "W10 —", PL: "Tydzień 10 —")
    expect(screen.getByText(/\b10\b/)).toBeInTheDocument();
    // Session count (EN: "1 session", PL: "1 trening")
    expect(screen.getByText(/1 (session|trening)/i)).toBeInTheDocument();
  });

  it('calls onToggleExpand when chevron is clicked', () => {
    const onToggleExpand = vi.fn();
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} onToggleExpand={onToggleExpand} />
      </Wrapper>,
    );
    const header = screen.getByTestId('history-week-toggle');
    fireEvent.click(header);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('does not show full grid when collapsed', () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={false} />
      </Wrapper>,
    );
    // Day column headers should not be present when collapsed
    expect(screen.queryByText(/monday/i)).not.toBeInTheDocument();
  });

  it('shows full read-only grid when expanded', () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={true} />
      </Wrapper>,
    );
    // The session's description should appear in the grid (may render in both mobile+desktop views)
    expect(screen.getAllByText('Easy run').length).toBeGreaterThan(0);
  });

  it('does not render add-session controls in expanded read-only grid', () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={true} />
      </Wrapper>,
    );
    // Plus/add buttons should not appear — it's read-only
    expect(screen.queryByRole('button', { name: /add session/i })).not.toBeInTheDocument();
  });

  it('shows day-picker dialog when copy icon is clicked on a session card', () => {
    const onCopySession = vi.fn();
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={true} onCopySession={onCopySession} />
      </Wrapper>,
    );

    // Click the copy icon on the session card
    const copyBtns = screen.getAllByTestId('session-copy-btn');
    fireEvent.click(copyBtns[0]);

    // Dialog should open with day buttons
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // All 7 day buttons should be present
    expect(screen.getByRole('button', { name: /thursday/i })).toBeInTheDocument();
  });

  it('calls onCopySession when a day is selected in the picker dialog', () => {
    const onCopySession = vi.fn();
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={true} onCopySession={onCopySession} />
      </Wrapper>,
    );

    fireEvent.click(screen.getAllByTestId('session-copy-btn')[0]);
    // Click 'thursday' in the day picker dialog
    fireEvent.click(screen.getByRole('button', { name: /thursday/i }));

    expect(onCopySession).toHaveBeenCalledWith(mockSession, 'thursday');
    // Dialog should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes day-picker dialog when Cancel is clicked without calling onCopySession', () => {
    const onCopySession = vi.fn();
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <HistoryWeekRow {...defaultProps} isExpanded={true} onCopySession={onCopySession} />
      </Wrapper>,
    );

    fireEvent.click(screen.getAllByTestId('session-copy-btn')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click Cancel button to close
    fireEvent.click(screen.getByRole('button', { name: /cancel|anuluj/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onCopySession).not.toHaveBeenCalled();
  });
});

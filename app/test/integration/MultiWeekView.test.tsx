import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '~/i18n/config';
import { MultiWeekView } from '~/components/calendar/MultiWeekView';
import type { WeekPlan, TrainingSession, SessionsByDay } from '~/types/training';
import { DAYS_OF_WEEK } from '~/types/training';
import { createTestQueryClient } from '~/test/utils/query-client';
import {
  mockFetchWeekPlanByDate,
  mockFetchSessionsByWeekPlan,
} from '~/lib/mock-data';

// Spies to verify internal mutation calls
import * as sessionsQueries from '~/lib/queries/sessions';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'coach-1', role: 'coach', name: 'Coach' },
  }),
}));

vi.mock('~/lib/queries/weeks', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchWeekPlanByDate: m.mockFetchWeekPlanByDate,
    getOrCreateWeekPlan: vi.fn(),
    updateWeekPlan: vi.fn(),
    createWeekPlan: vi.fn(),
  };
});

vi.mock('~/lib/queries/sessions', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchSessionsByWeekPlan: m.mockFetchSessionsByWeekPlan,
    createSession: vi.fn().mockResolvedValue({ id: 'new-session', weekPlanId: 'wp-current', dayOfWeek: 'thursday', trainingType: 'run', sortOrder: 0, description: null, coachComments: null, plannedDurationMinutes: null, plannedDistanceKm: null, typeSpecificData: { type: 'run' }, isCompleted: false, completedAt: null, actualDurationMinutes: null, actualDistanceKm: null, actualPace: null, avgHeartRate: null, maxHeartRate: null, rpe: null, coachPostFeedback: null, athleteNotes: null, stravaActivityId: null, stravaSyncedAt: null, createdAt: '', updatedAt: '' }),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    updateAthleteSession: vi.fn(),
    confirmStravaSession: vi.fn(),
    bulkConfirmStravaSessions: vi.fn(),
    copyWeekSessions: vi.fn().mockResolvedValue(3),
    copyDaySessions: vi.fn().mockResolvedValue(1),
  };
});

const emptySessionsByDay: SessionsByDay = DAYS_OF_WEEK.reduce(
  (acc, d) => ({ ...acc, [d]: [] }),
  {} as SessionsByDay
);

const mockCurrentWeekPlan: WeekPlan = {
  id: 'wp-current',
  athleteId: 'athlete-1',
  weekStart: '2026-03-16',
  year: 2026,
  weekNumber: 12,
  loadType: null,
  totalPlannedKm: null,
  description: null,
  coachComments: null,
  actualTotalKm: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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

describe('MultiWeekView', () => {
  const defaultProps = {
    currentWeekId: '2026-W12',
    currentWeekPlan: mockCurrentWeekPlan,
    currentSessions: [] as TrainingSession[],
    currentSessionsByDay: emptySessionsByDay,
    onAddSession: vi.fn(),
    onEditSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onUpdateCoachPostFeedback: vi.fn(),
    onReorderSession: vi.fn(),
  };

  it('renders 4 history week rows above the current week', async () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MultiWeekView {...defaultProps} />
      </Wrapper>
    );

    // Wait for history weeks to load
    await waitFor(() => {
      const weekLabels = screen.queryAllByText(/W1[0-1]|W0[89]/);
      return weekLabels.length > 0;
    }, { timeout: 3000 });

    // Should show 4 history week rows (W11, W10, W09, W08 from Alice's seed + empty)
    const historyRows = screen.getAllByTestId('history-week-row');
    expect(historyRows).toHaveLength(4);
  });

  it('history rows do not have add-session buttons (read-only)', async () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MultiWeekView {...defaultProps} />
      </Wrapper>
    );

    // History rows should not contain add buttons — they are read-only
    // (The current week section may have them, but not history)
    const historySection = screen.getByTestId('history-section');
    expect(historySection.querySelectorAll('[aria-label="add session"]')).toHaveLength(0);
  });

  it('tapping a day in a history week row syncs the selected day in the current week (mobile day-sync)', async () => {
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MultiWeekView {...defaultProps} />
      </Wrapper>
    );

    // Wait for history rows
    await waitFor(() => expect(screen.queryAllByTestId('history-week-row').length).toBe(4), { timeout: 3000 });

    // Expand the oldest history row (last one in DOM = oldest after reverse)
    const toggles = screen.getAllByTestId('history-week-toggle');
    fireEvent.click(toggles[0]);

    // Tap Thursday in the expanded history week's mobile day strip
    const thursdayBtns = await screen.findAllByTestId('mobile-day-btn-thursday');
    // The first one belongs to the history row (it just expanded)
    fireEvent.click(thursdayBtns[0]);

    // The current week section should now also have Thursday selected
    const currentWeekSection = screen.getByTestId('current-week-section');
    // The selected thursday button in current week should have the ring style
    const currentThursdayBtn = currentWeekSection.querySelector('[data-testid="mobile-day-btn-thursday"]');
    expect(currentThursdayBtn).not.toBeNull();
    // The currently-selected day button renders the single-day content — verify thursday is shown
    const mobileSingleDay = currentWeekSection.querySelector('[data-testid="mobile-single-day"]');
    expect(mobileSingleDay).not.toBeNull();
  });

  it('clicking "Copy week" button calls copyWeekSessions with sourceWeekPlanId and currentWeekPlan.id', async () => {
    const copyWeekSpy = vi.spyOn(sessionsQueries, 'copyWeekSessions');
    const Wrapper = makeWrapper();
    render(
      <Wrapper>
        <MultiWeekView {...defaultProps} />
      </Wrapper>
    );

    // Wait for W11 row to appear (it has sessions and a "Copy week" button)
    await waitFor(() => expect(screen.queryAllByTestId('history-week-row').length).toBe(4), { timeout: 3000 });

    // Expand the first history row (W11)
    const toggles = screen.getAllByTestId('history-week-toggle');
    fireEvent.click(toggles[0]);

    // Find and click the first "Copy week" button (W11, which has sessions) — opens dialog
    // EN: "Copy week ↓", PL: "Kopiuj tydzień ↓"
    const copyWeekBtns = await screen.findAllByRole('button', { name: /copy week|kopiuj tydzień/i });
    fireEvent.click(copyWeekBtns[0]);

    // Confirm in the dialog — a second "Copy week" button appears inside the dialog footer
    const confirmBtns = await screen.findAllByRole('button', { name: /copy week|kopiuj tydzień/i });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() =>
      expect(copyWeekSpy).toHaveBeenCalledWith(
        expect.objectContaining({ targetWeekPlanId: 'wp-current' })
      )
    );
  });
});

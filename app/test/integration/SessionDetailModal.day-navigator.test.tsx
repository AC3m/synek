/**
 * Day navigator in SessionDetailModal.
 *
 * Tests user-observable behaviour — what the user sees and what happens
 * when they interact — not internal state or implementation details.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import i18n from '~/i18n/config';
import { SessionDetailModal } from '~/components/training/SessionDetailModal';

// ─── i18n ────────────────────────────────────────────────────────────────────
// The config singleton defaults to Polish. Switch to English so tests can
// query by readable English labels ("Previous day", "Wednesday", "Close").
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
afterAll(async () => {
  await i18n.changeLanguage('pl'); // restore default for other files in the same worker
});
import { SessionActionsProvider } from '~/lib/context/SessionActionsContext';
import type { SessionActionsContextValue } from '~/lib/context/SessionActionsContext';
import type { TrainingSession, DayOfWeek } from '~/types/training';
import { createTestQueryClient } from '~/test/utils/query-client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', role: 'athlete' }, effectiveAthleteId: 'user-1' }),
}));

vi.mock('~/lib/hooks/useIsMobile', () => ({
  useIsMobile: () => false, // always render the desktop Dialog variant
}));

vi.mock('~/lib/hooks/useStrengthVariants', () => ({
  useStrengthVariant: () => ({ data: undefined }),
  useStrengthSessionExercises: () => ({ data: [] }),
  useLastSessionExercises: () => ({ data: undefined }),
  useUpsertSessionExercises: () => ({ mutate: vi.fn() }),
}));

vi.mock('~/lib/hooks/useJunctionConnection', () => ({
  useJunctionWorkout: () => ({ data: undefined }),
  useJunctionConnectionStatus: () => ({ data: null }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Week of Mon 16 Mar – Sun 22 Mar 2026
const weekStart = '2026-03-16';

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'sess-1',
    weekPlanId: 'wp-1',
    dayOfWeek: 'wednesday',
    sortOrder: 0,
    trainingType: 'run',
    description: 'Easy run',
    coachComments: null,
    plannedDurationMinutes: 45,
    plannedDistanceKm: 8,
    typeSpecificData: { type: 'run' },
    isCompleted: false,
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
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function renderModal({
  session = makeSession(),
  onMoveToDay,
}: {
  session?: TrainingSession;
  onMoveToDay?: (sessionId: string, day: DayOfWeek) => void;
} = {}) {
  const onOpenChange = vi.fn();
  const queryClient = createTestQueryClient();

  const contextValue: SessionActionsContextValue = {
    readonly: false,
    athleteMode: true,
    showAthleteControls: false,
    stravaConnected: false,
    junctionConnected: false,
    onMoveToDay,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <SessionActionsProvider value={contextValue}>{children}</SessionActionsProvider>
        </I18nextProvider>
      </QueryClientProvider>
    );
  }

  render(
    <SessionDetailModal
      open={true}
      onOpenChange={onOpenChange}
      session={session}
      weekStart={weekStart}
    />,
    { wrapper: Wrapper },
  );

  return { onOpenChange };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SessionDetailModal — day navigator', () => {
  it("shows the session's current day in the navigator", () => {
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }) });

    // The day trigger button contains the day name
    expect(screen.getByRole('button', { name: /wednesday/i })).toBeInTheDocument();
  });

  it('right arrow advances the displayed day by one', async () => {
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }), onMoveToDay: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /next day/i }));

    expect(screen.getByRole('button', { name: /thursday/i })).toBeInTheDocument();
  });

  it('left arrow moves the displayed day back by one', async () => {
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }), onMoveToDay: vi.fn() });

    await userEvent.click(screen.getByRole('button', { name: /previous day/i }));

    expect(screen.getByRole('button', { name: /tuesday/i })).toBeInTheDocument();
  });

  it('left arrow is disabled on Monday — cannot go before the week start', () => {
    renderModal({ session: makeSession({ dayOfWeek: 'monday' }), onMoveToDay: vi.fn() });

    expect(screen.getByRole('button', { name: /previous day/i })).toBeDisabled();
  });

  it('right arrow is disabled on Sunday — cannot go past the week end', () => {
    renderModal({ session: makeSession({ dayOfWeek: 'sunday' }), onMoveToDay: vi.fn() });

    expect(screen.getByRole('button', { name: /next day/i })).toBeDisabled();
  });

  it('both arrows are disabled when the modal has no move permission', () => {
    // No onMoveToDay provided — read-only display
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }) });

    expect(screen.getByRole('button', { name: /previous day/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next day/i })).toBeDisabled();
  });

  it('calendar picker opens showing all 7 days and lets the user jump to any day', async () => {
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }), onMoveToDay: vi.fn() });

    // Open the picker
    await userEvent.click(screen.getByRole('button', { name: /wednesday/i }));

    // All 7 day abbreviations are visible in the popover
    for (const abbr of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getByText(abbr)).toBeInTheDocument();
    }

    // Jump to Saturday (non-adjacent)
    await userEvent.click(screen.getByRole('button', { name: /^sat/i }));

    // Navigator now shows Saturday; popover is gone
    expect(screen.getByRole('button', { name: /saturday/i })).toBeInTheDocument();
    expect(screen.queryByText('Mon')).not.toBeInTheDocument();
  });

  it('fires onMoveToDay with the chosen day when the modal closes after a change', async () => {
    const onMoveToDay = vi.fn();
    const { onOpenChange } = renderModal({
      session: makeSession({ dayOfWeek: 'wednesday' }),
      onMoveToDay,
    });

    // Change to Thursday via the right arrow
    await userEvent.click(screen.getByRole('button', { name: /next day/i }));

    // Close the modal
    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onMoveToDay).toHaveBeenCalledWith('sess-1', 'thursday');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not fire onMoveToDay when the modal closes without any day change', async () => {
    const onMoveToDay = vi.fn();
    renderModal({ session: makeSession({ dayOfWeek: 'wednesday' }), onMoveToDay });

    // Close without touching the navigator
    await userEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onMoveToDay).not.toHaveBeenCalled();
  });

  it('navigator resets to the original day when the session prop changes', async () => {
    const onMoveToDay = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <I18nextProvider i18n={i18n}>
          <SessionActionsProvider
            value={{
              readonly: false,
              athleteMode: true,
              showAthleteControls: false,
              stravaConnected: false,
              junctionConnected: false,
              onMoveToDay,
            }}
          >
            <SessionDetailModal
              open={true}
              onOpenChange={vi.fn()}
              session={makeSession({ dayOfWeek: 'wednesday' })}
              weekStart={weekStart}
            />
          </SessionActionsProvider>
        </I18nextProvider>
      </QueryClientProvider>,
    );

    // Advance to Thursday
    await userEvent.click(screen.getByRole('button', { name: /next day/i }));
    expect(screen.getByRole('button', { name: /thursday/i })).toBeInTheDocument();

    // Simulate server confirming a different session on Tuesday
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <I18nextProvider i18n={i18n}>
          <SessionActionsProvider
            value={{
              readonly: false,
              athleteMode: true,
              showAthleteControls: false,
              stravaConnected: false,
              junctionConnected: false,
              onMoveToDay,
            }}
          >
            <SessionDetailModal
              open={true}
              onOpenChange={vi.fn()}
              session={makeSession({ id: 'sess-2', dayOfWeek: 'tuesday' })}
              weekStart={weekStart}
            />
          </SessionActionsProvider>
        </I18nextProvider>
      </QueryClientProvider>,
    );

    // Navigator snaps to the new session's day, not the stale pending state
    expect(screen.getByRole('button', { name: /tuesday/i })).toBeInTheDocument();
  });
});

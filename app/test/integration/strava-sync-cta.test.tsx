import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { createTestQueryClient } from '~/test/utils/query-client';
import { SessionCard } from '~/components/calendar/SessionCard';
import type { TrainingSession } from '~/types/training';

/**
 * Strava Sync CTA tests.
 *
 * SessionCard:
 *   - Shows "Sync" chip when athleteMode + completed + no stravaActivityId + stravaConnected
 *   - Hides chip when stravaActivityId is set (already synced)
 *   - Hides chip when stravaConnected=false
 *   - Hides chip when session not completed
 *   - Hides chip in coach mode
 *   - Calls onSyncStrava on chip click
 *
 * Athlete week view header:
 *   - Shows "Sync Now" button when Strava connected
 *   - Shows "Connect" link when Strava not connected
 *   - Disables "Sync Now" and shows "Syncing…" when isPending
 *   - Calls mutate with correct args on click
 */

// ─── Mock hooks ──────────────────────────────────────────────────────────────

const mockUseStravaConnectionStatus = vi.fn();
const mockSyncMutate = vi.fn();
const mockUseStravaSync = vi.fn();

vi.mock('~/lib/hooks/useStravaConnection', () => ({
  useStravaConnectionStatus: (userId: string) =>
    mockUseStravaConnectionStatus(userId),
  useStravaSync: () => mockUseStravaSync(),
}));

let mockUser: { id: string; role: string; name: string; email: string } | null =
  null;

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    effectiveAthleteId: mockUser?.id ?? null,
    selectedAthleteId: null,
    athletes: [],
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('~/lib/hooks/useWeekPlan', () => ({
  useWeekPlan: () => ({
    data: {
      id: 'wp-1',
      weekStart: '2026-03-02',
      athleteId: 'athlete-1',
      title: 'Test Week',
      loadType: 'medium',
    },
    isLoading: false,
  }),
}));

vi.mock('~/lib/hooks/useSessions', () => ({
  useSessions: () => ({ data: [] }),
  useUpdateAthleteSession: () => ({ mutate: vi.fn() }),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ weekId: '2026-W10', locale: 'en' }),
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'session-1',
    weekPlanId: 'wp-1',
    dayOfWeek: 'monday',
    trainingType: 'run',
    description: null,
    coachComments: null,
    plannedDurationMinutes: 60,
    plannedDistanceKm: 10,
    sortOrder: 0,
    isCompleted: false,
    completedAt: null,
    athleteNotes: null,
    actualDurationMinutes: null,
    actualDistanceKm: null,
    actualPace: null,
    avgHeartRate: null,
    maxHeartRate: null,
    rpe: null,
    stravaActivityId: null,
    stravaSyncedAt: null,
    coachPostFeedback: null,
    typeSpecificData: { type: 'run' },
    createdAt: '2026-03-02T00:00:00Z',
    updatedAt: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

function renderCard(
  session: TrainingSession,
  props: {
    athleteMode?: boolean;
    stravaConnected?: boolean;
    onSyncStrava?: () => void;
  } = {}
) {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SessionCard session={session} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── SessionCard tests ────────────────────────────────────────────────────────

describe('SessionCard — Strava Sync chip', () => {
  it('shows Sync chip when athleteMode, completed, no stravaActivityId, stravaConnected', () => {
    const session = makeSession({ isCompleted: true, stravaActivityId: null });
    renderCard(session, { athleteMode: true, stravaConnected: true });
    expect(screen.getByRole('button', { name: /strava\.sync/i })).toBeInTheDocument();
  });

  it('does not show Sync chip when stravaActivityId is set (already synced)', () => {
    const session = makeSession({ isCompleted: true, stravaActivityId: 12345 });
    renderCard(session, { athleteMode: true, stravaConnected: true });
    expect(screen.queryByRole('button', { name: /strava\.sync/i })).not.toBeInTheDocument();
  });

  it('does not show Sync chip when stravaConnected=false', () => {
    const session = makeSession({ isCompleted: true, stravaActivityId: null });
    renderCard(session, { athleteMode: true, stravaConnected: false });
    expect(screen.queryByRole('button', { name: /strava\.sync/i })).not.toBeInTheDocument();
  });

  it('does not show Sync chip when session is not completed', () => {
    const session = makeSession({ isCompleted: false, stravaActivityId: null });
    renderCard(session, { athleteMode: true, stravaConnected: true });
    expect(screen.queryByRole('button', { name: /strava\.sync/i })).not.toBeInTheDocument();
  });

  it('does not show Sync chip in coach mode (no athleteMode)', () => {
    const session = makeSession({ isCompleted: true, stravaActivityId: null });
    renderCard(session, { athleteMode: false, stravaConnected: true });
    expect(screen.queryByRole('button', { name: /strava\.sync/i })).not.toBeInTheDocument();
  });

  it('does not show Sync chip for rest_day sessions', () => {
    const session = makeSession({
      isCompleted: true,
      stravaActivityId: null,
      trainingType: 'rest_day',
    });
    renderCard(session, { athleteMode: true, stravaConnected: true });
    expect(screen.queryByRole('button', { name: /strava\.sync/i })).not.toBeInTheDocument();
  });

  it('calls onSyncStrava when Sync chip is clicked', async () => {
    const onSyncStrava = vi.fn();
    const session = makeSession({ isCompleted: true, stravaActivityId: null });
    renderCard(session, { athleteMode: true, stravaConnected: true, onSyncStrava });

    const chip = screen.getByRole('button', { name: /strava\.sync/i });
    await userEvent.click(chip);

    expect(onSyncStrava).toHaveBeenCalledTimes(1);
  });
});

// ─── Athlete week view header tests ──────────────────────────────────────────

import AthleteWeekView from '~/routes/athlete/week.$weekId';

function renderWeekView() {
  const qc = createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/en/athlete/week/2026-W10']}>
        <AthleteWeekView />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AthleteWeekView — Strava header CTA', () => {
  beforeEach(() => {
    mockUser = {
      id: 'athlete-1',
      role: 'athlete',
      name: 'Alice',
      email: 'alice@synek.app',
    };
    mockSyncMutate.mockReset();
    mockUseStravaSync.mockReturnValue({
      mutate: mockSyncMutate,
      isPending: false,
    });
  });

  it('shows "Sync Now" button when Strava is connected', () => {
    mockUseStravaConnectionStatus.mockReturnValue({
      data: { connected: true, stravaAthleteName: 'Alice Strava' },
    });
    renderWeekView();
    expect(
      screen.getByRole('button', { name: /strava\.syncNow/i })
    ).toBeInTheDocument();
  });

  it('shows "Connect with Strava" link when Strava is not connected', () => {
    mockUseStravaConnectionStatus.mockReturnValue({
      data: { connected: false },
    });
    renderWeekView();
    expect(
      screen.getByRole('link', { name: /strava\.connect/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /strava\.syncNow/i })
    ).not.toBeInTheDocument();
  });

  it('calls mutate with userId and weekStart when Sync Now is clicked', async () => {
    mockUseStravaConnectionStatus.mockReturnValue({
      data: { connected: true },
    });
    renderWeekView();

    const btn = screen.getByRole('button', { name: /strava\.syncNow/i });
    await userEvent.click(btn);

    expect(mockSyncMutate).toHaveBeenCalledWith({
      userId: 'athlete-1',
      weekStart: '2026-03-02',
    });
  });

  it('shows "Syncing…" and disables button when isPending', () => {
    mockUseStravaConnectionStatus.mockReturnValue({
      data: { connected: true },
    });
    mockUseStravaSync.mockReturnValue({
      mutate: mockSyncMutate,
      isPending: true,
    });
    renderWeekView();

    const btn = screen.getByRole('button', { name: /strava\.syncing/i });
    expect(btn).toBeDisabled();
  });
});

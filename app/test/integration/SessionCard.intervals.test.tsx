import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { SessionCard } from '~/components/calendar/SessionCard';
import { resetMockLaps } from '~/lib/mock-data/strava-laps';
import { fetchSessionLaps } from '~/lib/queries/strava-laps';
import { createTestQueryClient } from '~/test/utils/query-client';
import type { TrainingSession } from '~/types/training';
import type { StravaLap } from '~/types/strava';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

// Control variable read by the mock
let mockLapResult: StravaLap[] | null = null;
let mockLapShouldFail = false;

vi.mock('~/lib/queries/strava-laps', () => ({
  fetchSessionLaps: vi.fn(),
  toLap: vi.fn(),
  mockFetchSessionLaps: vi.fn(),
}));



// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

const STRUCTURED_LAPS: StravaLap[] = [
  {
    id: 'l1',
    lapIndex: 0,
    name: 'Warm Up',
    intensity: 'active',
    segmentType: 'warmup',
    distanceMeters: 1000,
    elapsedTimeSeconds: 360,
    movingTimeSeconds: 360,
    averageSpeed: 2.78,
    averageHeartrate: 138,
    maxHeartrate: 148,
    averageCadence: 170,
    paceZone: 2,
  },
  {
    id: 'l2',
    lapIndex: 1,
    name: 'Interval 1',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 255,
    movingTimeSeconds: 255,
    averageSpeed: 3.92,
    averageHeartrate: 172,
    maxHeartrate: 178,
    averageCadence: 186,
    paceZone: 5,
  },
  {
    id: 'l3',
    lapIndex: 2,
    name: 'Recovery 1',
    intensity: 'rest',
    segmentType: 'recovery',
    distanceMeters: 500,
    elapsedTimeSeconds: 180,
    movingTimeSeconds: 180,
    averageSpeed: 2.78,
    averageHeartrate: 155,
    maxHeartrate: 165,
    averageCadence: 174,
    paceZone: 3,
  },
];

const AUTO_LAPS: StravaLap[] = [
  {
    id: 'al1',
    lapIndex: 0,
    name: 'Lap 1',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 330,
    movingTimeSeconds: 330,
    averageSpeed: 3.03,
    averageHeartrate: null,
    maxHeartrate: null,
    averageCadence: null,
    paceZone: null,
  },
];

function makeSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'session-interval-1',
    weekPlanId: 'wp-test',
    dayOfWeek: 'wednesday',
    sortOrder: 0,
    trainingType: 'run',
    description: '6×1km intervals',
    coachComments: null,
    plannedDurationMinutes: 55,
    plannedDistanceKm: 12,
    typeSpecificData: { type: 'run' },
    isCompleted: true,
    completedAt: '2026-03-04T08:00:00Z',
    actualDurationMinutes: 58,
    actualDistanceKm: 12.1,
    actualPace: '4:45',
    avgHeartRate: 165,
    maxHeartRate: 181,
    rpe: 8,
    coachPostFeedback: null,
    athleteNotes: null,
    stravaActivityId: 111,
    stravaSyncedAt: '2026-03-04T09:00:00Z',
    isStravaConfirmed: true,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-04T09:00:00Z',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockLapResult = null;
  mockLapShouldFail = false;
  resetMockLaps();
  vi.mocked(fetchSessionLaps).mockClear();
  vi.mocked(fetchSessionLaps).mockImplementation(() => {
    if (mockLapShouldFail) return Promise.reject(new Error('network error'));
    return Promise.resolve(mockLapResult ?? []);
  });
});

describe('SessionCard — interval affordance', () => {
  it('shows skeleton while lap data is loading', async () => {
    // Never resolve — stays loading
    vi.mocked(fetchSessionLaps).mockImplementation(
      () => new Promise(() => {})
    );

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  // Note: In tests, t() returns the i18n key string (empty resources in setup.ts).
  // So t('intervals.viewButton') → 'intervals.viewButton',
  //    t('intervals.retry') → 'intervals.retry', etc.

  it('shows "Intervals" button when laps load with rest laps', async () => {
    mockLapResult = STRUCTURED_LAPS;

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('intervals.viewButton')).toBeTruthy();
    });
    // Skeleton should be gone
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('opens modal when "Intervals" button is clicked', async () => {
    mockLapResult = STRUCTURED_LAPS;

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    await waitFor(() => screen.getByText('intervals.viewButton'));
    fireEvent.click(screen.getByText('intervals.viewButton'));

    // Modal title should appear (may be prefixed with session name)
    await waitFor(() => {
      expect(screen.getByText(/intervals\.modalTitle/)).toBeTruthy();
    });
  });

  it('shows "Intervals" button when laps load with only active laps (auto-laps)', async () => {
    mockLapResult = AUTO_LAPS;

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('intervals.viewButton')).toBeTruthy();
    });
  });

  it('shows retry prompt when lap fetch fails', async () => {
    mockLapShouldFail = true;

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('intervals.retry')).toBeTruthy();
    });
  });

  it('shows no interval affordance for an unsynced run session', async () => {
    const { Wrapper } = makeWrapper();
    render(
      <SessionCard
        session={makeSession({ stravaActivityId: null })}
        userRole="athlete"
        athleteMode
      />,
      { wrapper: Wrapper }
    );

    // fetchSessionLaps should not be called
    expect(vi.mocked(fetchSessionLaps)).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.queryByText('intervals.viewButton')).toBeNull();
  });

  it('shows no interval affordance for coach on unconfirmed session', async () => {
    const { Wrapper } = makeWrapper();
    render(
      <SessionCard
        session={makeSession({ isStravaConfirmed: false })}
        userRole="coach"
      />,
      { wrapper: Wrapper }
    );

    expect(vi.mocked(fetchSessionLaps)).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(screen.queryByText('intervals.viewButton')).toBeNull();
  });

  it('shows interval affordance for coach on confirmed session', async () => {
    mockLapResult = STRUCTURED_LAPS;

    const { Wrapper } = makeWrapper();
    render(
      <SessionCard
        session={makeSession({ isStravaConfirmed: true })}
        userRole="coach"
      />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('intervals.viewButton')).toBeTruthy();
    });
  });
});

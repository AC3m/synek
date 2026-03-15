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
    name: 'Interval 2',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 258,
    movingTimeSeconds: 258,
    averageSpeed: 3.88,
    averageHeartrate: 174,
    maxHeartrate: 181,
    averageCadence: 185,
    paceZone: 5,
  },
  {
    id: 'l4',
    lapIndex: 3,
    name: 'Interval 3',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 260,
    movingTimeSeconds: 260,
    averageSpeed: 3.85,
    averageHeartrate: 175,
    maxHeartrate: 182,
    averageCadence: 184,
    paceZone: 5,
  },
  {
    id: 'l5',
    lapIndex: 4,
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

describe('SessionCard — interval affordance via detail modal', () => {
  it('opens detail modal when card is clicked', async () => {
    const { Wrapper, } = makeWrapper();
    const { container } = render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    fireEvent.click(container.firstChild as Element);

    await waitFor(() => {
      // Modal opens and shows planned section
      expect(screen.getByText('sessionDetail.planned')).toBeTruthy();
    });
  });

  it('shows loading skeleton in modal while lap data is loading', async () => {
    // Never resolve — stays loading
    vi.mocked(fetchSessionLaps).mockImplementation(
      () => new Promise(() => {})
    );

    const { Wrapper } = makeWrapper();
    const { container } = render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    fireEvent.click(container.firstChild as Element);

    await waitFor(() => {
      expect(screen.getByText('sessionDetail.planned')).toBeTruthy();
    });

    expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();
  });

  it('shows interval table columns in modal when laps load with structured intervals', async () => {
    mockLapResult = STRUCTURED_LAPS;

    const { Wrapper } = makeWrapper();
    const { container } = render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    fireEvent.click(container.firstChild as Element);

    // Wait for modal to open then laps to load
    await waitFor(() => {
      expect(screen.getByText('intervals.columns.segment')).toBeTruthy();
    });
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('shows retry button in modal when lap fetch fails', async () => {
    mockLapShouldFail = true;

    const { Wrapper } = makeWrapper();
    const { container } = render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    fireEvent.click(container.firstChild as Element);

    await waitFor(() => {
      expect(screen.getByText('intervals.retry')).toBeTruthy();
    });
  });

  it('does not load laps for an unsynced run session', async () => {
    const { Wrapper } = makeWrapper();
    render(
      <SessionCard
        session={makeSession({ stravaActivityId: null })}
        userRole="athlete"
        athleteMode
      />,
      { wrapper: Wrapper }
    );

    expect(vi.mocked(fetchSessionLaps)).not.toHaveBeenCalled();
  });

  it('does not load laps for coach on unconfirmed session', async () => {
    const { Wrapper } = makeWrapper();
    render(
      <SessionCard
        session={makeSession({ isStravaConfirmed: false })}
        userRole="coach"
      />,
      { wrapper: Wrapper }
    );

    expect(vi.mocked(fetchSessionLaps)).not.toHaveBeenCalled();
  });

  it('loads laps for coach on confirmed session and shows interval table', async () => {
    mockLapResult = STRUCTURED_LAPS;

    const { Wrapper } = makeWrapper();
    const { container } = render(
      <SessionCard
        session={makeSession({ isStravaConfirmed: true })}
        userRole="coach"
      />,
      { wrapper: Wrapper }
    );

    fireEvent.click(container.firstChild as Element);

    await waitFor(() => {
      expect(screen.getByText('intervals.columns.segment')).toBeTruthy();
    });
  });

  it('does not open modal when interactive element on card is clicked', async () => {
    const { Wrapper } = makeWrapper();
    render(
      <SessionCard session={makeSession()} userRole="athlete" athleteMode />,
      { wrapper: Wrapper }
    );

    // Click the completion toggle (a button) — modal should NOT open
    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    expect(screen.queryByText('sessionDetail.planned')).toBeNull();
  });
});

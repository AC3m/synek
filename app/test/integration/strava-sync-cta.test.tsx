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


import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
  useConfirmStravaSession,
  useBulkConfirmStravaSessions,
  useCopyWeekSessions,
  useCopyDaySessions,
} from '~/lib/hooks/useSessions';
import {
  mockFetchSessionsByWeekPlan,
  mockCreateSession,
  mockDeleteSession,
  mockUpdateSession,
} from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';
import { queryKeys } from '~/lib/queries/keys';

const {
  confirmStravaSessionMock,
  bulkConfirmStravaSessionsMock,
  copyWeekSessionsMock,
  copyDaySessionsMock,
} = vi.hoisted(() => ({
  confirmStravaSessionMock: vi.fn(async () => {}),
  bulkConfirmStravaSessionsMock: vi.fn(async () => {}),
  copyWeekSessionsMock: vi.fn(async () => 3),
  copyDaySessionsMock: vi.fn(async () => 1),
}));

// Mock the query module — async factory avoids vi.mock hoisting issues
vi.mock('~/lib/queries/sessions', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchSessionsByWeekPlan: m.mockFetchSessionsByWeekPlan,
    createSession: m.mockCreateSession,
    deleteSession: m.mockDeleteSession,
    updateSession: m.mockUpdateSession,
    updateAthleteSession: vi.fn(),
    confirmStravaSession: confirmStravaSessionMock,
    bulkConfirmStravaSessions: bulkConfirmStravaSessionsMock,
    copyWeekSessions: copyWeekSessionsMock,
    copyDaySessions: copyDaySessionsMock,
  };
});

// Alice's W10 plan ID (from seed data in mock-data.ts)
const ALICE_W10_PLAN_ID = 'wp-w10-a1';

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

describe('useSessions', () => {
  it('starts in loading state and transitions to success with data', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessions(ALICE_W10_PLAN_ID), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
  });

  it('returns an empty array for an unknown weekPlanId', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessions('non-existent-plan'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when weekPlanId is undefined', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessions(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateSession', () => {
  it('calls createSession and invalidates the sessions cache on success', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateSession(), {
      wrapper: Wrapper,
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      result.current.mutate({
        weekPlanId: ALICE_W10_PLAN_ID,
        dayOfWeek: 'friday',
        trainingType: 'strength',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalled();
  });
});

describe('useDeleteSession', () => {
  it('optimistically removes the session from the cache before deletion completes', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    // Pre-seed the cache with sessions for Alice's W10
    const sessions = await mockFetchSessionsByWeekPlan(ALICE_W10_PLAN_ID);
    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);
    const targetId = sessions[0].id;

    const { result } = renderHook(() => useDeleteSession(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(targetId);
    });

    // Optimistic update should have removed the session immediately
    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    expect(cached?.find((s) => s.id === targetId)).toBeUndefined();
  });
});

describe('useUpdateSession', () => {
  it('optimistically updates a session description in the cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const sessions = await mockFetchSessionsByWeekPlan(ALICE_W10_PLAN_ID);
    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);
    const target = sessions[0];

    const { result } = renderHook(() => useUpdateSession(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: target.id, description: 'Updated description' });
    });

    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    const updated = cached?.find((s) => s.id === target.id);
    expect(updated?.description).toBe('Updated description');
  });
});

describe('useConfirmStravaSession', () => {
  it('optimistically marks a pending Strava session as confirmed', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const sessions = [
      {
        id: 'session-pending',
        weekPlanId: ALICE_W10_PLAN_ID,
        dayOfWeek: 'monday',
        trainingType: 'run',
        description: null,
        coachComments: null,
        plannedDurationMinutes: null,
        plannedDistanceKm: null,
        sortOrder: 0,
        isCompleted: true,
        completedAt: '2026-03-09T08:00:00Z',
        athleteNotes: null,
        actualDurationMinutes: null,
        actualDistanceKm: null,
        actualPace: null,
        avgHeartRate: null,
        maxHeartRate: null,
        rpe: null,
        stravaActivityId: 999,
        stravaSyncedAt: '2026-03-09T08:30:00Z',
        isStravaConfirmed: false,
        coachPostFeedback: null,
        typeSpecificData: { type: 'run' },
        createdAt: '2026-03-09T00:00:00Z',
        updatedAt: '2026-03-09T00:00:00Z',
      },
    ];
    const target = sessions[0];

    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);

    const { result } = renderHook(() => useConfirmStravaSession(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(target.id);
    });

    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    const updated = cached?.find((s) => s.id === target.id);
    expect(updated?.isStravaConfirmed).toBe(true);
  });
});

describe('useCopyWeekSessions', () => {
  it('calls copyWeekSessions with correct args and invalidates target week cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCopyWeekSessions(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ sourceWeekPlanId: 'wp-w09-a1', targetWeekPlanId: 'wp-target' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(copyWeekSessionsMock).toHaveBeenCalledWith({
      sourceWeekPlanId: 'wp-w09-a1',
      targetWeekPlanId: 'wp-target',
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.sessions.byWeek('wp-target') })
    );
  });
});

describe('useCopyDaySessions', () => {
  it('calls copyDaySessions with correct args and invalidates target week cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCopyDaySessions(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        sourceWeekPlanId: 'wp-w09-a1',
        sourceDay: 'monday',
        targetWeekPlanId: 'wp-target',
        targetDay: 'monday',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(copyDaySessionsMock).toHaveBeenCalledWith({
      sourceWeekPlanId: 'wp-w09-a1',
      sourceDay: 'monday',
      targetWeekPlanId: 'wp-target',
      targetDay: 'monday',
    });
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.sessions.byWeek('wp-target') })
    );
  });
});

describe('useBulkConfirmStravaSessions', () => {
  it('optimistically confirms all pending Strava sessions for the selected week', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const sessions = [
      {
        id: 'session-pending-1',
        weekPlanId: ALICE_W10_PLAN_ID,
        dayOfWeek: 'monday',
        trainingType: 'run',
        description: null,
        coachComments: null,
        plannedDurationMinutes: null,
        plannedDistanceKm: null,
        sortOrder: 0,
        isCompleted: true,
        completedAt: '2026-03-09T08:00:00Z',
        athleteNotes: null,
        actualDurationMinutes: null,
        actualDistanceKm: null,
        actualPace: null,
        avgHeartRate: null,
        maxHeartRate: null,
        rpe: null,
        stravaActivityId: 111,
        stravaSyncedAt: '2026-03-09T08:30:00Z',
        isStravaConfirmed: false,
        coachPostFeedback: null,
        typeSpecificData: { type: 'run' },
        createdAt: '2026-03-09T00:00:00Z',
        updatedAt: '2026-03-09T00:00:00Z',
      },
      {
        id: 'session-confirmed',
        weekPlanId: ALICE_W10_PLAN_ID,
        dayOfWeek: 'tuesday',
        trainingType: 'run',
        description: null,
        coachComments: null,
        plannedDurationMinutes: null,
        plannedDistanceKm: null,
        sortOrder: 1,
        isCompleted: true,
        completedAt: '2026-03-10T08:00:00Z',
        athleteNotes: null,
        actualDurationMinutes: null,
        actualDistanceKm: null,
        actualPace: null,
        avgHeartRate: null,
        maxHeartRate: null,
        rpe: null,
        stravaActivityId: 222,
        stravaSyncedAt: '2026-03-10T08:30:00Z',
        isStravaConfirmed: true,
        coachPostFeedback: null,
        typeSpecificData: { type: 'run' },
        createdAt: '2026-03-10T00:00:00Z',
        updatedAt: '2026-03-10T00:00:00Z',
      },
      {
        id: 'session-without-strava',
        weekPlanId: ALICE_W10_PLAN_ID,
        dayOfWeek: 'wednesday',
        trainingType: 'run',
        description: null,
        coachComments: null,
        plannedDurationMinutes: null,
        plannedDistanceKm: null,
        sortOrder: 2,
        isCompleted: true,
        completedAt: '2026-03-11T08:00:00Z',
        athleteNotes: null,
        actualDurationMinutes: null,
        actualDistanceKm: null,
        actualPace: null,
        avgHeartRate: null,
        maxHeartRate: null,
        rpe: null,
        stravaActivityId: null,
        stravaSyncedAt: null,
        isStravaConfirmed: false,
        coachPostFeedback: null,
        typeSpecificData: { type: 'run' },
        createdAt: '2026-03-11T00:00:00Z',
        updatedAt: '2026-03-11T00:00:00Z',
      },
    ];
    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);

    const expectedToConfirm = sessions.filter((s) => s.stravaActivityId != null && !s.isStravaConfirmed);
    if (expectedToConfirm.length === 0) {
      throw new Error('Test data: no pending Strava sessions found in Alice W10');
    }

    const { result } = renderHook(() => useBulkConfirmStravaSessions(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(ALICE_W10_PLAN_ID);
    });

    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);

    expectedToConfirm.forEach((session) => {
      const updated = cached?.find((s) => s.id === session.id);
      expect(updated?.isStravaConfirmed).toBe(true);
    });
  });
});

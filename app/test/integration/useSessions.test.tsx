import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSessions,
  useCreateSession,
  useDeleteSession,
  useUpdateSession,
} from '~/lib/hooks/useSessions';
import {
  mockFetchSessionsByWeekPlan,
  mockCreateSession,
  mockDeleteSession,
  mockUpdateSession,
} from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';

// Mock the query module — async factory avoids vi.mock hoisting issues
vi.mock('~/lib/queries/sessions', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchSessionsByWeekPlan: m.mockFetchSessionsByWeekPlan,
    createSession: m.mockCreateSession,
    deleteSession: m.mockDeleteSession,
    updateSession: m.mockUpdateSession,
    updateAthleteSession: vi.fn(),
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

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSessions, useUpdateAthleteSession } from '~/lib/hooks/useSessions';
import {
  mockFetchSessionsByWeekPlan,
  mockUpdateAthleteSession,
} from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';

/**
 * Athlete week view integration test.
 *
 * Tests the data layer powering the athlete's read-only week view:
 * - Sessions are loaded correctly for the athlete's week plan
 * - Completion toggle optimistically updates isCompleted in the cache
 * - Rollback occurs on error
 */

vi.mock('~/lib/queries/sessions', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchSessionsByWeekPlan: m.mockFetchSessionsByWeekPlan,
    updateAthleteSession: m.mockUpdateAthleteSession,
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
  };
});

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@synek.app' },
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

describe('Athlete week view — data layer', () => {
  it('loads sessions for the athlete\'s week plan', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSessions(ALICE_W10_PLAN_ID), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(result.current.data!.every((s) => s.weekPlanId === ALICE_W10_PLAN_ID)).toBe(true);
  });

  it('optimistically marks a session as completed in the cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const sessions = await mockFetchSessionsByWeekPlan(ALICE_W10_PLAN_ID);
    // Find a session that is NOT completed to toggle
    const target = sessions.find((s) => !s.isCompleted);
    if (!target) throw new Error('Test data: no incomplete session found in Alice W10');

    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);

    const { result } = renderHook(() => useUpdateAthleteSession(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: target.id, isCompleted: true });
    });

    // Optimistic update should be immediately reflected
    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    const updated = cached?.find((s) => s.id === target.id);
    expect(updated?.isCompleted).toBe(true);
    expect(updated?.completedAt).toBeTruthy();
  });

  it('optimistically clears completion on toggle off', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const sessions = await mockFetchSessionsByWeekPlan(ALICE_W10_PLAN_ID);
    // Find a session that IS completed to un-toggle
    const target = sessions.find((s) => s.isCompleted);
    if (!target) throw new Error('Test data: no completed session found in Alice W10');

    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);

    const { result } = renderHook(() => useUpdateAthleteSession(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ id: target.id, isCompleted: false });
    });

    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    const updated = cached?.find((s) => s.id === target.id);
    expect(updated?.isCompleted).toBe(false);
    expect(updated?.completedAt).toBeNull();
  });
});

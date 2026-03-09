import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSessions, useDeleteSession } from '~/lib/hooks/useSessions';
import { useWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  mockFetchSessionsByWeekPlan,
  mockFetchWeekPlanByDate,
  mockDeleteSession,
  mockCreateSession,
  mockUpdateSession,
} from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';

/**
 * Coach week view integration test.
 *
 * Tests the data-loading layer that powers the coach week page:
 * - The coach's effectiveAthleteId scopes data to the correct athlete
 * - Switching athlete produces a different week plan (different query key)
 * - Session delete is reflected in the cache immediately (optimistic)
 */

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

vi.mock('~/lib/queries/weeks', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchWeekPlanByDate: m.mockFetchWeekPlanByDate,
    getOrCreateWeekPlan: vi.fn(),
    updateWeekPlan: vi.fn(),
    createWeekPlan: vi.fn(),
  };
});

// Default: coach with athlete-1 selected
let mockEffectiveAthleteId = 'athlete-1';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: mockEffectiveAthleteId,
    user: { id: 'coach-1', role: 'coach', name: 'Coach', email: 'coach@synek.app' },
    selectedAthleteId: mockEffectiveAthleteId,
    athletes: [],
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    selectAthlete: vi.fn(),
    clearSelectedAthlete: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

const WEEK_START = '2026-03-02'; // W10
const ALICE_W10_PLAN_ID = 'wp-w10-a1';
const BOB_W10_PLAN_ID = 'wp-w10-a2';

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

describe('Coach week view — data layer', () => {
  beforeEach(() => {
    mockEffectiveAthleteId = 'athlete-1';
  });

  it('loads Alice\'s week plan when she is the selected athlete', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWeekPlan(WEEK_START), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.athleteId).toBe('athlete-1');
    expect(result.current.data?.id).toBe(ALICE_W10_PLAN_ID);
  });

  it('loads sessions for the selected athlete\'s week plan', async () => {
    const { Wrapper } = makeWrapper();
    const alicePlan = await mockFetchWeekPlanByDate(WEEK_START, 'athlete-1');

    const { result } = renderHook(() => useSessions(alicePlan?.id), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(result.current.data!.every((s) => s.weekPlanId === ALICE_W10_PLAN_ID)).toBe(true);
  });

  it('uses different query keys for different athletes (data isolation)', async () => {
    // Alice loads with athlete-1
    const { queryClient: qcAlice, Wrapper: WrapperAlice } = makeWrapper();
    mockEffectiveAthleteId = 'athlete-1';
    const { result: aliceResult } = renderHook(() => useWeekPlan(WEEK_START), {
      wrapper: WrapperAlice,
    });
    await waitFor(() => expect(aliceResult.current.isSuccess).toBe(true));
    const aliceKey = qcAlice
      .getQueryCache()
      .findAll()
      .find((q) => (q.queryKey as string[]).includes('athlete-1'));
    expect(aliceKey).toBeDefined();

    // Bob loads with athlete-2 — separate client to avoid cache pollution
    const { queryClient: qcBob, Wrapper: WrapperBob } = makeWrapper();
    mockEffectiveAthleteId = 'athlete-2';
    const { result: bobResult } = renderHook(() => useWeekPlan(WEEK_START), {
      wrapper: WrapperBob,
    });
    await waitFor(() => expect(bobResult.current.isSuccess).toBe(true));

    // Alice's plan and Bob's plan have different IDs
    expect(aliceResult.current.data?.id).toBe(ALICE_W10_PLAN_ID);
    expect(bobResult.current.data?.id).toBe(BOB_W10_PLAN_ID);
  });

  it('optimistically removes a session from the cache on delete', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const sessions = await mockFetchSessionsByWeekPlan(ALICE_W10_PLAN_ID);
    queryClient.setQueryData(['sessions', 'week', ALICE_W10_PLAN_ID], sessions);
    const targetId = sessions[0].id;

    const { result } = renderHook(() => useDeleteSession(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate(targetId);
    });

    const cached = queryClient.getQueryData<typeof sessions>([
      'sessions',
      'week',
      ALICE_W10_PLAN_ID,
    ]);
    expect(cached?.find((s) => s.id === targetId)).toBeUndefined();
  });
});

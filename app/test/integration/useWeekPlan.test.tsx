import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWeekPlan, useGetOrCreateWeekPlan, useUpdateWeekPlan } from '~/lib/hooks/useWeekPlan';
import {
  mockFetchWeekPlanByDate,
  mockGetOrCreateWeekPlan,
  mockUpdateWeekPlan,
} from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';

// Mock auth — provide effectiveAthleteId without a real AuthProvider
vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@test.com' },
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

// Mock query module — async factory avoids vi.mock hoisting issues
vi.mock('~/lib/queries/weeks', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchWeekPlanByDate: m.mockFetchWeekPlanByDate,
    getOrCreateWeekPlan: m.mockGetOrCreateWeekPlan,
    updateWeekPlan: m.mockUpdateWeekPlan,
    createWeekPlan: vi.fn(),
  };
});

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

describe('useWeekPlan', () => {
  it('fetches Alice\'s W10 plan by weekStart', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWeekPlan('2026-03-02'), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.weekStart).toBe('2026-03-02');
    expect(result.current.data?.athleteId).toBe('athlete-1');
  });

  it('returns null for a week with no plan', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWeekPlan('2026-01-05'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when weekStart is empty', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWeekPlan(''), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useGetOrCreateWeekPlan', () => {
  it('seeds the QueryClient cache with the returned plan on success', async () => {
    const { queryClient, Wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetOrCreateWeekPlan(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({
        weekStart: '2026-03-02',
        year: 2026,
        weekNumber: 10,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const plan = result.current.data;
    expect(plan).toBeDefined();
    expect(plan?.weekStart).toBe('2026-03-02');

    // The onSuccess handler should have seeded the cache
    const cached = queryClient.getQueryData([
      'weeks',
      plan!.weekStart,
      plan!.athleteId,
    ]);
    expect(cached).toBeDefined();
  });
});

describe('useUpdateWeekPlan', () => {
  it('optimistically updates the week description in the cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    // Pre-seed the cache
    const existing = await mockFetchWeekPlanByDate('2026-03-02', 'athlete-1');
    if (!existing) throw new Error('Test data missing: Alice W10 plan');
    queryClient.setQueryData(['weeks', '2026-03-02', 'athlete-1'], existing);

    const { result } = renderHook(() => useUpdateWeekPlan(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: existing.id, description: 'Updated description' });
    });

    // Optimistic update should be visible before the mutation settles
    const cached = queryClient.getQueryData<typeof existing>([
      'weeks',
      '2026-03-02',
      'athlete-1',
    ]);
    expect(cached?.description).toBe('Updated description');
  });
});

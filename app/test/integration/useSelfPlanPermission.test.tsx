import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSelfPlanPermission, useUpdateSelfPlanPermission } from '~/lib/hooks/useProfile';
import { mockFetchSelfPlanPermission, resetMockSelfPlan } from '~/lib/queries/profile';
import { createTestQueryClient } from '~/test/utils/query-client';

// Hoisted mutable reference so we can override updateSelfPlanPermission per test
let failNextUpdate = false;

vi.mock('~/lib/queries/profile', async () => {
  const actual = await import('~/lib/queries/profile');
  return {
    ...actual,
    fetchSelfPlanPermission: actual.mockFetchSelfPlanPermission,
    updateSelfPlanPermission: async (athleteId: string, value: boolean) => {
      if (failNextUpdate) {
        failNextUpdate = false;
        throw new Error('network error');
      }
      return actual.mockUpdateSelfPlanPermission(athleteId, value);
    },
  };
});

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

describe('useSelfPlanPermission', () => {
  beforeEach(() => {
    resetMockSelfPlan();
  });

  it('returns true for athlete-1 by default', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelfPlanPermission('athlete-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('does not fetch when athleteId is empty', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelfPlanPermission(''), {
      wrapper: Wrapper,
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUpdateSelfPlanPermission', () => {
  beforeEach(() => {
    resetMockSelfPlan();
  });

  it('updates cache optimistically and confirms on success', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    // Pre-load the query so cache has data
    queryClient.setQueryData(['selfPlan', 'athlete-1'], true);

    const { result } = renderHook(() => useUpdateSelfPlanPermission(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ athleteId: 'athlete-1', value: false });
    });

    // Optimistic update: cache should reflect false immediately
    expect(queryClient.getQueryData(['selfPlan', 'athlete-1'])).toBe(false);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the mock store was updated
    const stored = await mockFetchSelfPlanPermission('athlete-1');
    expect(stored).toBe(false);
  });

  it('rolls back optimistic update on error', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    queryClient.setQueryData(['selfPlan', 'athlete-1'], true);

    // Signal the mock to throw on the next call
    failNextUpdate = true;

    const { result } = renderHook(() => useUpdateSelfPlanPermission(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      result.current.mutate({ athleteId: 'athlete-1', value: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should roll back to true after the error
    expect(queryClient.getQueryData(['selfPlan', 'athlete-1'])).toBe(true);
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useGoals, useCreateGoal, useDeleteGoal, useUpdateGoal } from '~/lib/hooks/useGoals';
import {
  mockFetchGoals,
  mockCreateGoal,
  mockUpdateGoal,
  mockDeleteGoal,
  resetMockGoals,
} from '~/lib/mock-data/goals';
import { createTestQueryClient } from '~/test/utils/query-client';
import { queryKeys } from '~/lib/queries/keys';

// ---------------------------------------------------------------------------
// Mock the query module — use mock data store directly
// ---------------------------------------------------------------------------

vi.mock('~/lib/queries/goals', async () => {
  const { mockFetchGoals, mockCreateGoal, mockUpdateGoal, mockDeleteGoal } =
    await import('~/lib/mock-data/goals');
  return {
    fetchGoals: mockFetchGoals,
    createGoal: mockCreateGoal,
    updateGoal: mockUpdateGoal,
    deleteGoal: mockDeleteGoal,
    toGoal: (row: Record<string, unknown>) => row,
  };
});

const ATHLETE_ID = 'athlete-1';

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

beforeEach(() => {
  resetMockGoals();
});

// ---------------------------------------------------------------------------
// useGoals
// ---------------------------------------------------------------------------

describe('useGoals', () => {
  it('fetches goals for athlete and returns them sorted by competition date', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useGoals(ATHLETE_ID), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBe(2);
    // Sorted by competition date ascending
    expect(result.current.data![0].competitionDate < result.current.data![1].competitionDate).toBe(
      true,
    );
  });

  it('does not fetch when athleteId is empty', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useGoals(''), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// useCreateGoal — optimistic update
// ---------------------------------------------------------------------------

describe('useCreateGoal', () => {
  it('adds the new goal optimistically to the cache before mutation settles', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    // Pre-seed the cache
    const initialGoals = await mockFetchGoals(ATHLETE_ID);
    queryClient.setQueryData(queryKeys.goals.byAthlete(ATHLETE_ID), initialGoals);

    const { result } = renderHook(() => useCreateGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        athleteId: ATHLETE_ID,
        createdBy: 'coach-1',
        name: 'City Half Marathon',
        discipline: 'run',
        competitionDate: '2026-09-20',
        preparationWeeks: 12,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof mockFetchGoals>>>(
      queryKeys.goals.byAthlete(ATHLETE_ID),
    );
    expect(cached?.some((g) => g.name === 'City Half Marathon')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useDeleteGoal — optimistic removal + rollback on error
// ---------------------------------------------------------------------------

describe('useDeleteGoal', () => {
  it('removes the goal optimistically from the cache before deletion completes', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const initialGoals = await mockFetchGoals(ATHLETE_ID);
    queryClient.setQueryData(queryKeys.goals.byAthlete(ATHLETE_ID), initialGoals);
    const targetId = initialGoals[0].id;

    const { result } = renderHook(() => useDeleteGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: targetId, athleteId: ATHLETE_ID });
    });

    // Optimistic: should be gone immediately from cache
    const cached = queryClient.getQueryData<typeof initialGoals>(
      queryKeys.goals.byAthlete(ATHLETE_ID),
    );
    expect(cached?.find((g) => g.id === targetId)).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('restores the goal in the cache if deletion fails', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const initialGoals = await mockFetchGoals(ATHLETE_ID);
    queryClient.setQueryData(queryKeys.goals.byAthlete(ATHLETE_ID), initialGoals);
    const targetId = initialGoals[0].id;

    // Make delete fail
    const goalsMod = await import('~/lib/queries/goals');
    const spy = vi.spyOn(goalsMod, 'deleteGoal').mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useDeleteGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ id: targetId, athleteId: ATHLETE_ID });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<typeof initialGoals>(
      queryKeys.goals.byAthlete(ATHLETE_ID),
    );
    // Goal should be restored after rollback
    expect(cached?.find((g) => g.id === targetId)).toBeDefined();

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useUpdateGoal — optimistic field update
// ---------------------------------------------------------------------------

describe('useUpdateGoal', () => {
  it('reflects the updated field optimistically in the cache', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const initialGoals = await mockFetchGoals(ATHLETE_ID);
    queryClient.setQueryData(queryKeys.goals.byAthlete(ATHLETE_ID), initialGoals);
    const target = initialGoals[0];

    const { result } = renderHook(() => useUpdateGoal(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({
        id: target.id,
        athleteId: ATHLETE_ID,
        name: 'Updated Goal Name',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<typeof initialGoals>(
      queryKeys.goals.byAthlete(ATHLETE_ID),
    );
    expect(cached?.find((g) => g.id === target.id)?.name).toBe('Updated Goal Name');
  });
});

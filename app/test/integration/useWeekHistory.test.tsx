import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useWeekHistory } from '~/lib/hooks/useWeekHistory';
import { mockFetchWeekPlanByDate, mockFetchSessionsByWeekPlan } from '~/lib/mock-data';
import { createTestQueryClient } from '~/test/utils/query-client';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    effectiveAthleteId: 'athlete-1',
    user: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@test.com' },
  }),
}));

vi.mock('~/lib/queries/weeks', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchWeekPlanByDate: m.mockFetchWeekPlanByDate,
    getOrCreateWeekPlan: vi.fn(),
    updateWeekPlan: vi.fn(),
    createWeekPlan: vi.fn(),
  };
});

vi.mock('~/lib/queries/sessions', async () => {
  const m = await import('~/lib/mock-data');
  return {
    fetchSessionsByWeekPlan: m.mockFetchSessionsByWeekPlan,
    createSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
    updateAthleteSession: vi.fn(),
    confirmStravaSession: vi.fn(),
    bulkConfirmStravaSessions: vi.fn(),
    copyWeekSessions: vi.fn(),
    copyDaySessions: vi.fn(),
  };
});

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

describe('useWeekHistory', () => {
  it('returns N previous weeks in descending order', async () => {
    const { Wrapper } = makeWrapper();
    // Alice has W09, W10, W11 in seed. W12 onwards don't exist.
    // Asking for 4 weeks back from W12:
    const { result } = renderHook(() => useWeekHistory('2026-W12', 4), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.every((hw) => !hw.isLoading)).toBe(true), {
      timeout: 3000,
    });

    expect(result.current).toHaveLength(4);
    // Most recent first
    expect(result.current[0].weekId).toBe('2026-W11');
    expect(result.current[1].weekId).toBe('2026-W10');
    expect(result.current[2].weekId).toBe('2026-W09');
    expect(result.current[3].weekId).toBe('2026-W08');
  });

  it('resolves weekPlan and sessions for known weeks', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useWeekHistory('2026-W12', 1), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current[0].isLoading).toBe(false), { timeout: 3000 });

    const w11 = result.current[0];
    expect(w11.weekId).toBe('2026-W11');
    expect(w11.weekPlan).not.toBeNull();
    expect(w11.weekPlan?.weekStart).toBe('2026-03-09');
    expect(w11.sessions.length).toBeGreaterThan(0);
  });

  it('returns weekPlan: null and sessions: [] for a week with no plan', async () => {
    const { Wrapper } = makeWrapper();
    // Going back far enough that no data exists
    const { result } = renderHook(() => useWeekHistory('2026-W05', 1), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current[0].isLoading).toBe(false), { timeout: 3000 });

    expect(result.current[0].weekPlan).toBeNull();
    expect(result.current[0].sessions).toEqual([]);
  });
});

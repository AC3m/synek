import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSelfPlanPermission } from '~/lib/hooks/useProfile';
import { resetMockSelfPlan, mockUpdateSelfPlanPermission } from '~/lib/queries/profile';
import { createTestQueryClient } from '~/test/utils/query-client';

/**
 * Tests self-planning permission visibility via the data layer.
 * Component-level rendering tests are covered by manual integration flow.
 */

vi.mock('~/lib/queries/profile', async () => {
  const actual = await import('~/lib/queries/profile');
  return {
    ...actual,
    fetchSelfPlanPermission: actual.mockFetchSelfPlanPermission,
    updateSelfPlanPermission: actual.mockUpdateSelfPlanPermission,
  };
});

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'athlete-1', role: 'athlete', name: 'Alice', email: 'alice@synek.app' },
    effectiveAthleteId: 'athlete-1',
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

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, Wrapper };
}

describe('Athlete week view — self-plan permission', () => {
  beforeEach(() => {
    resetMockSelfPlan();
  });

  it('returns true (planning enabled) by default for athlete-1', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelfPlanPermission('athlete-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('returns false when self-planning has been disabled', async () => {
    await mockUpdateSelfPlanPermission('athlete-1', false);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelfPlanPermission('athlete-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('returns true again after re-enabling self-planning', async () => {
    await mockUpdateSelfPlanPermission('athlete-1', false);
    await mockUpdateSelfPlanPermission('athlete-1', true);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSelfPlanPermission('athlete-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useInvites,
  useCreateInvite,
  useRevokeInvite,
} from '~/lib/hooks/useInvites';
import { createTestQueryClient } from '~/test/utils/query-client';
import { resetMockInvites, mockListInvites } from '~/lib/mock-data';
import type { Invite } from '~/types/invites';

vi.mock('~/lib/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'coach-1', role: 'coach', name: 'Coach' } }),
}));

// Mock the query module — async factory avoids vi.mock hoisting issues
vi.mock('~/lib/queries/invites', async () => {
  const m = await import('~/lib/mock-data');
  return {
    toInvite: (row: Record<string, unknown>) => ({
      id: row.id as string,
      token: row.token as string,
      coachId: row.coach_id as string | null,
      status: row.status as string,
      createdAt: row.created_at as string,
      expiresAt: row.expires_at as string,
      usedBy: row.used_by as string | null,
      usedAt: row.used_at as string | null,
    }),
    listInvites: m.mockListInvites,
    createInviteForCoach: m.mockCreateInvite,
    revokeInvite: m.mockRevokeInvite,
    getInvitePreview: m.mockGetInvitePreview,
  };
});

beforeEach(() => {
  resetMockInvites();
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

describe('useInvites', () => {
  it('returns the mock invite list for coach-1', async () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInvites('coach-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
    expect(result.current.data!.every((i) => i.coachId === 'coach-1')).toBe(true);
  });

  it('does not fetch when coachId is empty', () => {
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInvites(''), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateInvite', () => {
  it('optimistically inserts a pending invite before mutation resolves', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const initial = mockListInvites('coach-1');
    queryClient.setQueryData(['invites', 'coach-1'], initial);

    const { result } = renderHook(() => useCreateInvite(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate('coach-1');
    });

    // After optimistic update fires, the cache should contain a new pending invite
    const cached = queryClient.getQueryData<Invite[]>(['invites', 'coach-1']);
    expect(cached?.some((i) => i.status === 'pending')).toBe(true);
  });

  it('rolls back optimistic entry on mutation error', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    // Seed cache with NO pending invites to make the count stable
    const initial: Invite[] = mockListInvites('coach-1').filter(
      (i) => i.status !== 'pending'
    );
    queryClient.setQueryData(['invites', 'coach-1'], initial);
    const initialCount = initial.length;

    // Override the mock fn to force an error for this test only
    const invitesModule = await import('~/lib/queries/invites');
    const original = invitesModule.createInviteForCoach;
    vi.spyOn(invitesModule, 'createInviteForCoach').mockRejectedValueOnce(
      new Error('forced error')
    );

    const { result } = renderHook(() => useCreateInvite(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate('coach-1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData<Invite[]>(['invites', 'coach-1']);
    // After rollback the cache should be back to the original count
    expect(cached?.length ?? 0).toBe(initialCount);

    // Restore
    vi.spyOn(invitesModule, 'createInviteForCoach').mockImplementation(original);
  });
});

describe('useRevokeInvite', () => {
  it('optimistically sets invite status to revoked', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const invites = mockListInvites('coach-1');
    const pending = invites.find((i) => i.status === 'pending')!;
    expect(pending).toBeDefined();
    queryClient.setQueryData(['invites', 'coach-1'], invites);

    const { result } = renderHook(() => useRevokeInvite(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ inviteId: pending.id, coachId: 'coach-1' });
    });

    const cached = queryClient.getQueryData<Invite[]>(['invites', 'coach-1']);
    const updated = cached?.find((i) => i.id === pending.id);
    expect(updated?.status).toBe('revoked');
  });

  it('rolls back revoke on mutation error', async () => {
    const { queryClient, Wrapper } = makeWrapper();

    const invites = mockListInvites('coach-1');
    const pending = invites.find((i) => i.status === 'pending')!;
    expect(pending).toBeDefined();
    queryClient.setQueryData(['invites', 'coach-1'], invites);

    const invitesModule = await import('~/lib/queries/invites');
    vi.spyOn(invitesModule, 'revokeInvite').mockRejectedValueOnce(
      new Error('forced error')
    );

    const { result } = renderHook(() => useRevokeInvite(), { wrapper: Wrapper });

    await act(async () => {
      result.current.mutate({ inviteId: pending.id, coachId: 'coach-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // After rollback, the status should be restored to pending
    const cached = queryClient.getQueryData<Invite[]>(['invites', 'coach-1']);
    const restored = cached?.find((i) => i.id === pending.id);
    expect(restored?.status).toBe('pending');
  });
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '~/lib/queries/keys'
import {
  listInvites,
  createInviteForCoach,
  revokeInvite,
  getInvitePreview,
} from '~/lib/queries/invites'
import type { Invite } from '~/types/invites'

export function useInvites(coachId: string) {
  return useQuery({
    queryKey: queryKeys.invites.byCoach(coachId),
    queryFn: () => listInvites(coachId),
    enabled: !!coachId,
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (coachId: string) => createInviteForCoach(coachId),
    onMutate: async (coachId: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.invites.byCoach(coachId) })
      const prev = qc.getQueryData<Invite[]>(queryKeys.invites.byCoach(coachId))

      const optimistic: Invite = {
        id: `optimistic-${Date.now()}`,
        token: '',
        coachId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        usedBy: null,
        usedAt: null,
      }

      qc.setQueryData<Invite[]>(
        queryKeys.invites.byCoach(coachId),
        (old) => [optimistic, ...(old ?? [])]
      )

      return { prev, coachId }
    },
    onError: (_err, _coachId, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.invites.byCoach(ctx.coachId), ctx.prev)
      }
    },
    onSettled: (_data, _err, coachId) => {
      qc.invalidateQueries({ queryKey: queryKeys.invites.byCoach(coachId) })
    },
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ inviteId }: { inviteId: string; coachId: string }) =>
      revokeInvite(inviteId),
    onMutate: async ({ inviteId, coachId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.invites.byCoach(coachId) })
      const prev = qc.getQueryData<Invite[]>(queryKeys.invites.byCoach(coachId))

      qc.setQueryData<Invite[]>(
        queryKeys.invites.byCoach(coachId),
        (old) =>
          old?.map((i) => (i.id === inviteId ? { ...i, status: 'revoked' } : i)) ?? []
      )

      return { prev, coachId }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.invites.byCoach(ctx.coachId), ctx.prev)
      }
    },
    onSettled: (_data, _err, { coachId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.invites.byCoach(coachId) })
    },
  })
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: queryKeys.invites.preview(token),
    queryFn: () => getInvitePreview(token),
    enabled: !!token,
    retry: false,
  })
}

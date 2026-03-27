import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import {
  getStravaConnectionStatus,
  connectStrava,
  syncStrava,
  disconnectStrava,
} from '~/lib/queries/strava-connection';
import type { StravaConnectionStatus } from '~/types/strava';

export function useStravaConnectionStatus(userId: string) {
  return useQuery({
    queryKey: queryKeys.stravaConnection.byUser(userId),
    queryFn: () => getStravaConnectionStatus(userId),
    enabled: !!userId,
  });
}

export function useConnectStrava() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ code, userId }: { code: string; userId: string }) => connectStrava(code, userId),
    onSuccess: (_data, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.stravaConnection.byUser(userId) });
    },
  });
}

export function useStravaSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weekStart, sessionId }: { weekStart: string; sessionId?: string }) =>
      syncStrava(weekStart, sessionId),
    onMutate: async (_vars) => {
      // Snapshot all strava-connection caches because this mutation no longer
      // requires caller-provided userId.
      const all = qc.getQueriesData<StravaConnectionStatus>({
        queryKey: queryKeys.stravaConnection.all,
      });

      await Promise.all(all.map(([key]) => qc.cancelQueries({ queryKey: key })));

      const rollbacks: Array<{ key: readonly unknown[]; data: StravaConnectionStatus }> = [];
      for (const [key, data] of all) {
        if (data) rollbacks.push({ key, data });
      }

      return { rollbacks };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.rollbacks?.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stravaConnection.all });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

export function useStravaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => disconnectStrava(userId),
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: queryKeys.stravaConnection.byUser(userId) });
      const prev = qc.getQueryData<StravaConnectionStatus>(
        queryKeys.stravaConnection.byUser(userId),
      );
      qc.setQueryData(queryKeys.stravaConnection.byUser(userId), {
        connected: false,
        stravaAthleteName: null,
        connectedAt: null,
        lastSyncedAt: null,
      } satisfies StravaConnectionStatus);
      return { prev, userId };
    },
    onError: (_err, userId, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(queryKeys.stravaConnection.byUser(userId), ctx.prev);
      }
    },
    onSettled: (_data, _err, userId) => {
      qc.invalidateQueries({ queryKey: queryKeys.stravaConnection.byUser(userId) });
    },
  });
}

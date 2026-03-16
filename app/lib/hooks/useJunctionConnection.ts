// PoC: Junction Garmin integration — remove after evaluation
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchJunctionConnection,
  createJunctionConnection,
  disconnectJunctionConnection,
} from '~/lib/queries/junction-poc';
import { supabase } from '~/lib/supabase';
import type { JunctionPocConnection } from '~/types/junction-poc';

export function useJunctionConnectionStatus(userId: string) {
  return useQuery({
    queryKey: queryKeys.junctionPoc.connection(userId),
    queryFn: () => fetchJunctionConnection(userId),
    enabled: !!userId,
  });
}

export function useJunctionConnect() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appUserId,
      junctionUserId,
    }: {
      appUserId: string;
      junctionUserId: string;
    }) => createJunctionConnection(appUserId, junctionUserId),

    onMutate: async ({ appUserId, junctionUserId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.junctionPoc.connection(appUserId) });
      const prev = qc.getQueryData<JunctionPocConnection | null>(
        queryKeys.junctionPoc.connection(appUserId),
      );
      qc.setQueryData(queryKeys.junctionPoc.connection(appUserId), {
        id: 'optimistic',
        appUserId,
        junctionUserId,
        connectedAt: new Date().toISOString(),
        status: 'active',
        disconnectedAt: null,
      } satisfies JunctionPocConnection);
      return { prev, appUserId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.junctionPoc.connection(ctx.appUserId), ctx.prev);
      }
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.junctionPoc.connection(vars.appUserId) });
    },
  });
}

export function useJunctionDisconnect() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ appUserId }: { appUserId: string }) => {
      // Call disconnect Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('not_authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/junction-disconnect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'disconnect_failed');
      }

      await disconnectJunctionConnection(appUserId);
    },

    onMutate: async ({ appUserId }) => {
      await qc.cancelQueries({ queryKey: queryKeys.junctionPoc.connection(appUserId) });
      const prev = qc.getQueryData<JunctionPocConnection | null>(
        queryKeys.junctionPoc.connection(appUserId),
      );
      if (prev) {
        qc.setQueryData(queryKeys.junctionPoc.connection(appUserId), {
          ...prev,
          status: 'disconnected',
          disconnectedAt: new Date().toISOString(),
        } satisfies JunctionPocConnection);
      }
      return { prev, appUserId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.junctionPoc.connection(ctx.appUserId), ctx.prev);
      }
    },

    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.junctionPoc.connection(vars.appUserId) });
    },
  });
}

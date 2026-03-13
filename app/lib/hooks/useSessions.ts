import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchSessionsByWeekPlan,
  createSession,
  updateSession,
  deleteSession,
  updateAthleteSession,
  confirmStravaSession,
  bulkConfirmStravaSessions,
} from '~/lib/queries/sessions';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TrainingSession,
} from '~/types/training';

type SessionQueryRollback = { key: readonly unknown[]; data: TrainingSession[] };

async function patchAllSessionQueries(
  queryClient: QueryClient,
  patcher: (sessions: TrainingSession[]) => TrainingSession[] | null
): Promise<{ rollbacks: SessionQueryRollback[] }> {
  const allQueries = queryClient.getQueriesData<TrainingSession[]>({
    queryKey: queryKeys.sessions.all,
  });

  const updates: Array<{ key: readonly unknown[]; original: TrainingSession[]; updated: TrainingSession[] }> = [];

  for (const [key, sessions] of allQueries) {
    if (!sessions) continue;
    const updated = patcher(sessions);
    if (!updated) continue;
    updates.push({ key: key as readonly unknown[], original: sessions, updated });
  }

  await Promise.all(updates.map(({ key }) => queryClient.cancelQueries({ queryKey: key })));

  for (const { key, updated } of updates) {
    queryClient.setQueryData(key, updated);
  }

  return {
    rollbacks: updates.map(({ key, original }) => ({ key, data: original })),
  };
}

export function useSessions(weekPlanId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessions.byWeek(weekPlanId ?? ''),
    queryFn: () => fetchSessionsByWeekPlan(weekPlanId!),
    enabled: !!weekPlanId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.byWeek(data.weekPlanId),
      });
      toast.success('Session created');
    },
    onError: () => {
      toast.error('Failed to create session');
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateSessionInput) => updateSession(input),
    onMutate: async (input) =>
      patchAllSessionQueries(queryClient, (sessions) => {
        const idx = sessions.findIndex((s) => s.id === input.id);
        if (idx === -1) return null;
        const updated = [...sessions];
        updated[idx] = { ...updated[idx], ...input } as TrainingSession;
        return updated;
      }),
    onSuccess: () => {
      toast.success('Session updated');
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to update session');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onMutate: async (sessionId) =>
      patchAllSessionQueries(queryClient, (sessions) => {
        if (!sessions.some((s) => s.id === sessionId)) return null;
        return sessions.filter((s) => s.id !== sessionId);
      }),
    onSuccess: () => {
      toast.success('Session deleted');
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to delete session');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useUpdateAthleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AthleteSessionUpdate) => updateAthleteSession(input),
    onMutate: async (input) =>
      patchAllSessionQueries(queryClient, (sessions) => {
        const idx = sessions.findIndex((s) => s.id === input.id);
        if (idx === -1) return null;

        const updated = [...sessions];
        updated[idx] = {
          ...updated[idx],
          ...(input.isCompleted !== undefined && {
            isCompleted: input.isCompleted,
            completedAt: input.isCompleted ? new Date().toISOString() : null,
          }),
          ...(input.athleteNotes !== undefined && { athleteNotes: input.athleteNotes }),
          ...(input.actualDurationMinutes !== undefined && { actualDurationMinutes: input.actualDurationMinutes }),
          ...(input.actualDistanceKm !== undefined && { actualDistanceKm: input.actualDistanceKm }),
          ...(input.actualPace !== undefined && { actualPace: input.actualPace }),
          ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
          ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
          ...(input.rpe !== undefined && { rpe: input.rpe }),
        };
        return updated;
      }),
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to update');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useConfirmStravaSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => confirmStravaSession(sessionId),
    onMutate: async (sessionId) =>
      patchAllSessionQueries(queryClient, (sessions) => {
        const idx = sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return null;
        const updated = [...sessions];
        updated[idx] = { ...updated[idx], isStravaConfirmed: true };
        return updated;
      }),
    onSuccess: () => {
      toast.success('Session shared with coach');
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to share session');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useBulkConfirmStravaSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (weekPlanId: string) => bulkConfirmStravaSessions(weekPlanId),
    onMutate: async (weekPlanId) =>
      patchAllSessionQueries(queryClient, (sessions) => {
        let changed = false;
        const updated = sessions.map((session) => {
          if (
            session.weekPlanId === weekPlanId &&
            session.stravaActivityId &&
            !session.isStravaConfirmed
          ) {
            changed = true;
            return { ...session, isStravaConfirmed: true };
          }
          return session;
        });
        return changed ? updated : null;
      }),
    onSuccess: () => {
      toast.success('All pending sessions shared with coach');
    },
    onError: (_err, _variables, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        queryClient.setQueryData(key, data);
      });
      toast.error('Failed to share sessions');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

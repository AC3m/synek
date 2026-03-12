import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchSessionsByWeekPlan,
  createSession,
  updateSession,
  deleteSession,
  updateAthleteSession,
  confirmStravaSession,
} from '~/lib/queries/sessions';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TrainingSession,
} from '~/types/training';

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
    onMutate: async (input) => {
      const allQueries = queryClient.getQueriesData<TrainingSession[]>({
        queryKey: queryKeys.sessions.all,
      });
      const rollbacks: Array<{ key: readonly unknown[]; data: TrainingSession[] }> = [];

      for (const [key, sessions] of allQueries) {
        if (!sessions) continue;
        const idx = sessions.findIndex((s) => s.id === input.id);
        if (idx === -1) continue;

        await queryClient.cancelQueries({ queryKey: key });
        rollbacks.push({ key: key as readonly unknown[], data: sessions });

        const updated = [...sessions];
        updated[idx] = { ...updated[idx], ...input } as TrainingSession;
        queryClient.setQueryData(key, updated);
      }
      return { rollbacks };
    },
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
    onMutate: async (sessionId) => {
      const allQueries = queryClient.getQueriesData<TrainingSession[]>({
        queryKey: queryKeys.sessions.all,
      });
      const rollbacks: Array<{ key: readonly unknown[]; data: TrainingSession[] }> = [];

      for (const [key, sessions] of allQueries) {
        if (!sessions) continue;
        const idx = sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) continue;

        await queryClient.cancelQueries({ queryKey: key });
        rollbacks.push({ key: key as readonly unknown[], data: sessions });

        queryClient.setQueryData(
          key,
          sessions.filter((s) => s.id !== sessionId)
        );
      }
      return { rollbacks };
    },
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
    onMutate: async (input) => {
      const allQueries = queryClient.getQueriesData<TrainingSession[]>({
        queryKey: queryKeys.sessions.all,
      });
      const rollbacks: Array<{ key: readonly unknown[]; data: TrainingSession[] }> = [];

      for (const [key, sessions] of allQueries) {
        if (!sessions) continue;
        const idx = sessions.findIndex((s) => s.id === input.id);
        if (idx === -1) continue;

        await queryClient.cancelQueries({ queryKey: key });
        rollbacks.push({ key: key as readonly unknown[], data: sessions });

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
        queryClient.setQueryData(key, updated);
      }
      return { rollbacks };
    },
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
    onMutate: async (sessionId) => {
      const allQueries = queryClient.getQueriesData<TrainingSession[]>({
        queryKey: queryKeys.sessions.all,
      });
      const rollbacks: Array<{ key: readonly unknown[]; data: TrainingSession[] }> = [];

      for (const [key, sessions] of allQueries) {
        if (!sessions) continue;
        const idx = sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) continue;

        await queryClient.cancelQueries({ queryKey: key });
        rollbacks.push({ key: key as readonly unknown[], data: sessions });

        const updated = [...sessions];
        updated[idx] = { ...updated[idx], isStravaConfirmed: true };
        queryClient.setQueryData(key, updated);
      }
      return { rollbacks };
    },
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
    onMutate: async (weekPlanId) => {
      const queryKey = queryKeys.sessions.byWeek(weekPlanId);
      await queryClient.cancelQueries({ queryKey });

      const previousSessions = queryClient.getQueryData<TrainingSession[]>(queryKey);

      if (previousSessions) {
        queryClient.setQueryData<TrainingSession[]>(queryKey, (old) => {
          if (!old) return [];
          return old.map((session) => 
            session.stravaActivityId && !session.isStravaConfirmed
              ? { ...session, isStravaConfirmed: true }
              : session
          );
        });
      }

      return { previousSessions, queryKey };
    },
    onSuccess: () => {
      toast.success('All pending sessions shared with coach');
    },
    onError: (err: any, _variables, context) => {
      console.error('Bulk confirm failed:', err);
      if (context?.previousSessions) {
        queryClient.setQueryData(context.queryKey, context.previousSessions);
      }
      toast.error('Failed to share sessions');
    },
    onSettled: (_data, _err, weekPlanId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sessions.byWeek(weekPlanId),
      });
    },
  });
}

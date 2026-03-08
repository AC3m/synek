import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchSessionsByWeekPlan,
  createSession,
  updateSession,
  deleteSession,
  updateTraineeSession,
} from '~/lib/queries/sessions';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  TraineeSessionUpdate,
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

export function useUpdateTraineeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TraineeSessionUpdate) => updateTraineeSession(input),
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
          ...(input.traineeNotes !== undefined && {
            traineeNotes: input.traineeNotes,
          }),
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

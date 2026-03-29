import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchSessionsByWeekPlan,
  createSession,
  updateSession,
  deleteSession,
  updateAthleteSession,
  confirmStravaSession,
  bulkConfirmStravaSessions,
  copyWeekSessions,
  copyDaySessions,
} from '~/lib/queries/sessions';
import { updateGoal } from '~/lib/queries/goals';
import { buildCopySessionInput } from '~/lib/utils/session-copy';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  AthleteSessionUpdate,
  TrainingSession,
  CopyWeekInput,
  CopyDayInput,
  DayOfWeek,
} from '~/types/training';

type SessionQueryRollback = { key: readonly unknown[]; data: TrainingSession[] };

async function patchAllSessionQueries(
  queryClient: QueryClient,
  patcher: (sessions: TrainingSession[]) => TrainingSession[] | null,
): Promise<{ rollbacks: SessionQueryRollback[] }> {
  const allQueries = queryClient.getQueriesData<TrainingSession[]>({
    queryKey: queryKeys.sessions.all,
  });

  const updates: Array<{
    key: readonly unknown[];
    original: TrainingSession[];
    updated: TrainingSession[];
  }> = [];

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
    placeholderData: (prev) => prev,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: queryKeys.sessions.byWeek(data.weekPlanId),
      });
      toast.success(t('toast.sessionCreated'));
    },
    onError: () => {
      toast.error(t('toast.sessionCreateFailed'));
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (input: UpdateSessionInput) => updateSession(input),
    onMutate: async (input) => {
      let weekPlanId: string | undefined;
      const result = await patchAllSessionQueries(qc, (sessions) => {
        const idx = sessions.findIndex((s) => s.id === input.id);
        if (idx === -1) return null;
        if (!weekPlanId) weekPlanId = sessions[idx].weekPlanId;
        const updated = [...sessions];
        updated[idx] = { ...updated[idx], ...input } as TrainingSession;
        return updated;
      });
      return { ...result, weekPlanId };
    },
    onSuccess: async (data, variables) => {
      toast.success(t('toast.sessionUpdated'));

      // Keep linked goal in sync when a competition session's key fields change
      if (data.goalId) {
        const patch: Parameters<typeof updateGoal>[0] = { id: data.goalId };
        if (variables.description != null && variables.description !== '') patch.name = variables.description;
        if (variables.plannedDurationMinutes !== undefined)
          patch.goalTimeSeconds = variables.plannedDurationMinutes != null
            ? variables.plannedDurationMinutes * 60
            : null;
        if (variables.plannedDistanceKm !== undefined)
          patch.goalDistanceKm = variables.plannedDistanceKm ?? null;

        if (Object.keys(patch).length > 1) {
          await updateGoal(patch).catch(() => {});
          qc.invalidateQueries({ queryKey: queryKeys.goals.all });
        }
      }
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
      toast.error(t('toast.sessionUpdateFailed'));
    },
    onSettled: (_data, _err, _input, context) => {
      qc.invalidateQueries({
        queryKey: context?.weekPlanId
          ? queryKeys.sessions.byWeek(context.weekPlanId)
          : queryKeys.sessions.all,
      });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onMutate: async (sessionId) =>
      patchAllSessionQueries(qc, (sessions) => {
        if (!sessions.some((s) => s.id === sessionId)) return null;
        return sessions.filter((s) => s.id !== sessionId);
      }),
    onSuccess: () => {
      toast.success(t('toast.sessionDeleted'));
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
      toast.error(t('toast.sessionDeleteFailed'));
    },
    onSettled: (_data, _err, _sessionId, context) => {
      const keys = context?.rollbacks?.map(({ key }) => key) ?? [queryKeys.sessions.all];
      keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    },
  });
}

export function useUpdateAthleteSession() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (input: AthleteSessionUpdate) => updateAthleteSession(input),
    onMutate: async (input) =>
      patchAllSessionQueries(qc, (sessions) => {
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
          ...(input.actualDurationMinutes !== undefined && {
            actualDurationMinutes: input.actualDurationMinutes,
          }),
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
        qc.setQueryData(key, data);
      });
      toast.error(t('toast.performanceUpdateFailed'));
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useConfirmStravaSession() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (sessionId: string) => confirmStravaSession(sessionId),
    onMutate: async (sessionId) =>
      patchAllSessionQueries(qc, (sessions) => {
        const idx = sessions.findIndex((s) => s.id === sessionId);
        if (idx === -1) return null;
        const updated = [...sessions];
        updated[idx] = { ...updated[idx], isStravaConfirmed: true };
        return updated;
      }),
    onSuccess: () => {
      toast.success(t('toast.stravaSessionShared'));
    },
    onError: (_err, _input, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
      toast.error(t('toast.stravaSessionShareFailed'));
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

export function useCopyWeekSessions() {
  const qc = useQueryClient();
  const { t } = useTranslation('coach');

  return useMutation({
    mutationFn: (input: CopyWeekInput) => copyWeekSessions(input),
    onSuccess: (count, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions.byWeek(input.targetWeekPlanId) });
      toast.success(t('copy.successWeek', { count }));
    },
    onError: () => {
      toast.error(t('copy.error'));
    },
  });
}

export function useCopySession() {
  const qc = useQueryClient();
  const { t } = useTranslation('coach');

  return useMutation({
    mutationFn: ({
      session,
      targetWeekPlanId,
      targetDay,
    }: {
      session: TrainingSession;
      targetWeekPlanId: string;
      targetDay: DayOfWeek;
    }) => createSession(buildCopySessionInput(session, targetWeekPlanId, targetDay)),
    onSuccess: (_data, { targetWeekPlanId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions.byWeek(targetWeekPlanId) });
      toast.success(t('copy.successSession'));
    },
    onError: () => {
      toast.error(t('copy.error'));
    },
  });
}

export function useCopyDaySessions() {
  const qc = useQueryClient();
  const { t } = useTranslation('coach');

  return useMutation({
    mutationFn: (input: CopyDayInput) => copyDaySessions(input),
    onSuccess: (count, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.sessions.byWeek(input.targetWeekPlanId) });
      toast.success(t('copy.successDay', { count }));
    },
    onError: () => {
      toast.error(t('copy.error'));
    },
  });
}

export function useBulkConfirmStravaSessions() {
  const qc = useQueryClient();
  const { t } = useTranslation('common');

  return useMutation({
    mutationFn: (weekPlanId: string) => bulkConfirmStravaSessions(weekPlanId),
    onMutate: async (weekPlanId) =>
      patchAllSessionQueries(qc, (sessions) => {
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
      toast.success(t('toast.stravaAllShared'));
    },
    onError: (_err, _variables, context) => {
      context?.rollbacks?.forEach(({ key, data }) => {
        qc.setQueryData(key, data);
      });
      toast.error(t('toast.stravaAllShareFailed'));
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.sessions.all,
      });
    },
  });
}

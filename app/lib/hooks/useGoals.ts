import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseISO, format, startOfISOWeek, getISOWeek, getISOWeekYear, getISODay } from 'date-fns';
import { queryKeys } from '~/lib/queries/keys';
import { fetchGoals, createGoal, updateGoal, deleteGoal } from '~/lib/queries/goals';
import { getOrCreateWeekPlan } from '~/lib/queries/weeks';
import { createSession, fetchSessionByGoalId, updateSession } from '~/lib/queries/sessions';
import { DAYS_OF_WEEK } from '~/types/training';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '~/types/training';

export function useGoals(athleteId: string) {
  return useQuery({
    queryKey: queryKeys.goals.byAthlete(athleteId),
    queryFn: () => fetchGoals(athleteId),
    enabled: !!athleteId,
    placeholderData: (prev) => prev,
  });
}

// ---------------------------------------------------------------------------
// useCreateGoal
// ---------------------------------------------------------------------------

export function useCreateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalInput & { createdBy: string }) => createGoal(input),
    onSuccess: async (goal) => {
      // Auto-create the competition session in the goal's week.
      // Wrapped in try/catch so a session-creation failure doesn't surface as a
      // goal-creation failure — the goal was already persisted.
      try {
        const competitionDate = parseISO(goal.competitionDate);
        const weekStart = format(startOfISOWeek(competitionDate), 'yyyy-MM-dd');
        const year = getISOWeekYear(competitionDate);
        const weekNumber = getISOWeek(competitionDate);
        const dayOfWeek = DAYS_OF_WEEK[getISODay(competitionDate) - 1];

        const weekPlan = await getOrCreateWeekPlan(weekStart, year, weekNumber, goal.athleteId);
        await createSession({
          weekPlanId: weekPlan.id,
          dayOfWeek,
          trainingType: goal.discipline,
          description: goal.name,
          plannedDistanceKm: goal.goalDistanceKm ?? undefined,
          plannedDurationMinutes: goal.goalTimeSeconds
            ? Math.round(goal.goalTimeSeconds / 60)
            : undefined,
          goalId: goal.id,
        });
      } catch (err) {
        // Session creation is best-effort; the goal itself is saved.
        console.warn('[useCreateGoal] Failed to auto-create competition session:', err);
      }
    },
    onMutate: async (input) => {
      const key = queryKeys.goals.byAthlete(input.athleteId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Goal[]>(key);

      // Optimistic placeholder — real id will be replaced after settle
      const optimistic: Goal = {
        id: `optimistic-${Date.now()}`,
        athleteId: input.athleteId,
        createdBy: input.createdBy,
        name: input.name,
        discipline: input.discipline,
        competitionDate: input.competitionDate,
        preparationWeeks: input.preparationWeeks,
        goalDistanceKm: input.goalDistanceKm ?? null,
        goalTimeSeconds: input.goalTimeSeconds ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      qc.setQueryData<Goal[]>(key, (prev = []) =>
        [...prev, optimistic].sort(
          (a, b) => new Date(a.competitionDate).getTime() - new Date(b.competitionDate).getTime(),
        ),
      );

      return { snapshot, athleteId: input.athleteId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.goals.byAthlete(ctx.athleteId), ctx.snapshot);
      }
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.byAthlete(input.athleteId) });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      qc.invalidateQueries({ queryKey: queryKeys.weeks.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateGoal
// ---------------------------------------------------------------------------

export function useUpdateGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateGoalInput & { athleteId: string }) => updateGoal(input),
    onSuccess: async (data, variables) => {
      // Keep linked competition session in sync when goal name/time/distance changes
      const hasSessionFields =
        variables.name !== undefined ||
        variables.goalTimeSeconds !== undefined ||
        variables.goalDistanceKm !== undefined;

      if (hasSessionFields) {
        const linked = await fetchSessionByGoalId(data.id).catch(() => null);
        if (linked) {
          const patch: Parameters<typeof updateSession>[0] = { id: linked.id };
          if (variables.name !== undefined) patch.description = variables.name;
          if (variables.goalTimeSeconds !== undefined)
            patch.plannedDurationMinutes =
              variables.goalTimeSeconds != null ? Math.round(variables.goalTimeSeconds / 60) : null;
          if (variables.goalDistanceKm !== undefined)
            patch.plannedDistanceKm = variables.goalDistanceKm ?? null;

          if (Object.keys(patch).length > 1) {
            await updateSession(patch).catch(() => {});
          }
        }
      }
    },
    onMutate: async (input) => {
      const key = queryKeys.goals.byAthlete(input.athleteId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Goal[]>(key);

      qc.setQueryData<Goal[]>(key, (prev = []) =>
        prev.map((g) =>
          g.id === input.id
            ? {
                ...g,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.discipline !== undefined && { discipline: input.discipline }),
                ...(input.competitionDate !== undefined && {
                  competitionDate: input.competitionDate,
                }),
                ...(input.preparationWeeks !== undefined && {
                  preparationWeeks: input.preparationWeeks,
                }),
                ...(input.goalDistanceKm !== undefined && {
                  goalDistanceKm: input.goalDistanceKm,
                }),
                ...(input.goalTimeSeconds !== undefined && {
                  goalTimeSeconds: input.goalTimeSeconds,
                }),
                ...(input.notes !== undefined && { notes: input.notes }),
                updatedAt: new Date().toISOString(),
              }
            : g,
        ),
      );

      return { snapshot, athleteId: input.athleteId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.goals.byAthlete(ctx.athleteId), ctx.snapshot);
      }
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.byAthlete(input.athleteId) });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      qc.invalidateQueries({ queryKey: queryKeys.weeks.all });
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteGoal
// ---------------------------------------------------------------------------

export function useDeleteGoal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; athleteId: string }) => deleteGoal(id),
    onMutate: async ({ id, athleteId }) => {
      const key = queryKeys.goals.byAthlete(athleteId);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Goal[]>(key);

      qc.setQueryData<Goal[]>(key, (prev = []) => prev.filter((g) => g.id !== id));

      return { snapshot, athleteId };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.snapshot !== undefined) {
        qc.setQueryData(queryKeys.goals.byAthlete(ctx.athleteId), ctx.snapshot);
      }
    },
    onSettled: (_data, _err, { athleteId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.byAthlete(athleteId) });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
      qc.invalidateQueries({ queryKey: queryKeys.weeks.all });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { fetchWeekPlanByDate, getOrCreateWeekPlan, updateWeekPlan } from '~/lib/queries/weeks';
import { useAuth } from '~/lib/context/AuthContext';
import type { UpdateWeekPlanInput, WeekPlan } from '~/types/training';

export function useWeekPlan(weekStart: string) {
  const { effectiveAthleteId } = useAuth();
  return useQuery({
    queryKey: queryKeys.weeks.byId(weekStart, effectiveAthleteId ?? ''),
    queryFn: () => fetchWeekPlanByDate(weekStart, effectiveAthleteId!),
    enabled: !!weekStart && !!effectiveAthleteId,
    placeholderData: (prev) => prev,
  });
}

export function useGetOrCreateWeekPlan() {
  const qc = useQueryClient();
  const { effectiveAthleteId } = useAuth();

  return useMutation({
    mutationFn: ({
      weekStart,
      year,
      weekNumber,
    }: {
      weekStart: string;
      year: number;
      weekNumber: number;
    }) => getOrCreateWeekPlan(weekStart, year, weekNumber, effectiveAthleteId!),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.weeks.byId(data.weekStart, data.athleteId), data);
    },
  });
}

export function useUpdateWeekPlan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWeekPlanInput) => updateWeekPlan(input),
    onMutate: async (input) => {
      const queries = qc.getQueriesData<WeekPlan>({
        queryKey: queryKeys.weeks.all,
      });
      for (const [key, data] of queries) {
        if (data?.id === input.id) {
          await qc.cancelQueries({ queryKey: key });
          const previous = data;
          qc.setQueryData<WeekPlan>(key, {
            ...previous,
            ...(input.loadType !== undefined && { loadType: input.loadType }),
            ...(input.totalPlannedKm !== undefined && {
              totalPlannedKm: input.totalPlannedKm,
            }),
            ...(input.description !== undefined && {
              description: input.description,
            }),
            ...(input.coachComments !== undefined && {
              coachComments: input.coachComments,
            }),
          });
          return { previous, key };
        }
      }
    },
    onError: (_err, _input, context) => {
      if (context?.previous && context?.key) {
        qc.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.weeks.all });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import {
  fetchWeekPlanByDate,
  getOrCreateWeekPlan,
  updateWeekPlan,
} from '~/lib/queries/weeks';
import type { UpdateWeekPlanInput, WeekPlan } from '~/types/training';

export function useWeekPlan(weekStart: string) {
  return useQuery({
    queryKey: queryKeys.weeks.byId(weekStart),
    queryFn: () => fetchWeekPlanByDate(weekStart),
    enabled: !!weekStart,
  });
}

export function useGetOrCreateWeekPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      weekStart,
      year,
      weekNumber,
    }: {
      weekStart: string;
      year: number;
      weekNumber: number;
    }) => getOrCreateWeekPlan(weekStart, year, weekNumber),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.weeks.byId(data.weekStart), data);
    },
  });
}

export function useUpdateWeekPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateWeekPlanInput) => updateWeekPlan(input),
    onMutate: async (input) => {
      // Find the current cache entry
      const queries = queryClient.getQueriesData<WeekPlan>({
        queryKey: queryKeys.weeks.all,
      });
      for (const [key, data] of queries) {
        if (data?.id === input.id) {
          await queryClient.cancelQueries({ queryKey: key });
          const previous = data;
          queryClient.setQueryData<WeekPlan>(key, {
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
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.weeks.all });
    },
  });
}

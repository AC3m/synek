import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '~/lib/context/AuthContext';
import { fetchTrainingPreferences, updateTrainingPreferences } from '~/lib/queries/profile';
import { queryKeys } from '~/lib/queries/keys';
import { DEFAULT_TRAINING_PREFERENCES, type TrainingPreferences } from '~/types/preferences';

export function useTrainingPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.trainingPreferences.byUser(user?.id ?? ''),
    queryFn: () => fetchTrainingPreferences(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: (input: Partial<TrainingPreferences>) => {
      if (!user) throw new Error('not_authenticated');
      return updateTrainingPreferences(user.id, input);
    },
    onMutate: async (input) => {
      const key = queryKeys.trainingPreferences.byUser(user?.id ?? '');
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TrainingPreferences>(key);
      qc.setQueryData(key, { ...(prev ?? DEFAULT_TRAINING_PREFERENCES), ...input });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(queryKeys.trainingPreferences.byUser(user?.id ?? ''), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.trainingPreferences.byUser(user?.id ?? ''),
      });
    },
  });

  return {
    preferences: query.data ?? DEFAULT_TRAINING_PREFERENCES,
    isLoading: query.isLoading,
    update: mutation.mutate,
  };
}

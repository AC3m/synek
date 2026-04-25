import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { submitSupport } from '~/lib/queries/support';

export function useSubmitSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitSupport,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
  });
}

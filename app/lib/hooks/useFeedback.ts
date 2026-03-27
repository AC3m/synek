import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { createFeedback } from '~/lib/queries/feedback';

export function useSubmitFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFeedback,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.feedback.all });
    },
  });
}

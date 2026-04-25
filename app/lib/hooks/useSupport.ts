import { useMutation } from '@tanstack/react-query';
import { submitSupport } from '~/lib/queries/support';

export function useSubmitSupport() {
  return useMutation({
    mutationFn: submitSupport,
  });
}

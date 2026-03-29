import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { getAnalytics } from '~/lib/queries/analytics';
import type { AnalyticsParams } from '~/types/training';

export function useAnalytics(params: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.byParams(params),
    queryFn: () => getAnalytics(params),
    enabled: !!params.athleteId && (params.period !== 'goal' || !!params.goalId),
    placeholderData: (prev) => prev,
  });
}

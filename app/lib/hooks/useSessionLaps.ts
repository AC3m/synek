import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { fetchSessionLaps } from '~/lib/queries/strava-laps';

export function useSessionLaps(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.sessionLaps.bySession(sessionId),
    queryFn: () => fetchSessionLaps(sessionId),
    enabled: !!sessionId && enabled,
    staleTime: Infinity,  // lap data never changes once fetched — cached permanently
  });
}

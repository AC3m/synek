import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '~/lib/queries/keys';
import { getHealthKitSyncStatus, syncHealthKitWorkouts } from '~/lib/queries/healthkit-sync';
import {
  fetchHealthKitWorkouts,
  isHealthKitBridgeAvailable,
  requestHealthKitAuth,
} from '~/lib/integrations/healthkit-bridge';

const DEFAULT_LOOKBACK_DAYS = 30;

export function useHealthKitAvailable(): boolean {
  return isHealthKitBridgeAvailable();
}

export function useHealthKitSyncStatus(userId: string) {
  return useQuery({
    queryKey: queryKeys.healthkitSync.status(userId),
    queryFn: () => getHealthKitSyncStatus(userId),
    enabled: !!userId,
  });
}

interface SyncVars {
  userId: string;
  /** Override the default 30-day lookback (in days). */
  lookbackDays?: number;
}

/**
 * Asks iOS for HealthKit permission, fetches workouts since lookback window,
 * upserts them to Supabase and links to planned sessions where possible.
 */
export function useHealthKitSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, lookbackDays = DEFAULT_LOOKBACK_DAYS }: SyncVars) => {
      const auth = await requestHealthKitAuth();
      if (!auth.granted) {
        throw new Error('HealthKit permission required');
      }
      const sinceMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
      const workouts = await fetchHealthKitWorkouts(sinceMs);
      return syncHealthKitWorkouts({ userId, workouts });
    },
    onSettled: (_data, _err, { userId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.healthkitSync.status(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
}

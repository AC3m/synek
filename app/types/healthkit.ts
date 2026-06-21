/**
 * Payload the iOS bridge returns for each HKWorkout.
 * Activity IDs use HealthKit-side vocabulary — see `app/lib/utils/healthkit-activity-map.ts`
 * for the translation to synek's TrainingType.
 */
export interface HealthKitWorkoutPayload {
  hkUuid: string;
  activityId: string;
  hkActivityType: number;
  sourceName: string | null;
  sourceBundleId: string | null;
  startDate: string;
  endDate: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  activeEnergyKcal: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  raw: Record<string, unknown> | null;
}

/** Row shape persisted in `healthkit_workouts`. */
export interface HealthKitWorkout {
  id: string;
  hkUuid: string;
  userId: string;
  trainingSessionId: string | null;
  activityType: string | null;
  hkActivityType: number | null;
  sourceName: string | null;
  sourceBundleId: string | null;
  startDate: string;
  endDate: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  activeEnergyKcal: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
}

export interface HealthKitSyncStatus {
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  workoutsSynced: number;
}

export interface HealthKitSyncResult {
  upserted: number;
  matched: number;
  lastSyncAt: string;
}

import type { TrainingType } from '~/types/training';

/**
 * iOS bridge emits these activity IDs (see synek-ios HealthKitActivityMap.swift).
 * They are HealthKit-side identifiers — NOT the same vocabulary as synek's TrainingType.
 */
export type HealthKitActivityId =
  | 'run'
  | 'walk'
  | 'hike'
  | 'bike'
  | 'swim'
  | 'row'
  | 'elliptical'
  | 'strength'
  | 'yoga'
  | 'mixed-cardio'
  | 'hiit'
  | 'other';

const HK_TO_TRAINING_TYPE: Record<HealthKitActivityId, TrainingType> = {
  run: 'run',
  walk: 'walk',
  hike: 'hike',
  bike: 'cycling',
  swim: 'swimming',
  row: 'other',
  elliptical: 'elliptical',
  strength: 'strength',
  yoga: 'yoga',
  'mixed-cardio': 'other',
  hiit: 'other',
  other: 'other',
};

export function hkActivityToTrainingType(activityId: string): TrainingType {
  return HK_TO_TRAINING_TYPE[activityId as HealthKitActivityId] ?? 'other';
}

/**
 * Whether a synek training_type accepts a HK workout activity for auto-linking.
 * Used when matching a HKWorkout to a planned training_session on the same day.
 */
export function trainingTypeMatchesHk(sessionType: TrainingType, hkActivityId: string): boolean {
  if (sessionType === 'other') return false;
  const mapped = hkActivityToTrainingType(hkActivityId);
  if (mapped === 'other') return false;
  return mapped === sessionType;
}

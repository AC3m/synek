// ============================================================
// Training type enums and constants
// ============================================================

export const TRAINING_TYPES = [
  'run',
  'cycling',
  'strength',
  'yoga',
  'mobility',
  'swimming',
  'walk',
  'hike',
  'rest_day',
  'other',
] as const;

export type TrainingType = (typeof TRAINING_TYPES)[number];

export const LOAD_TYPES = ['easy', 'medium', 'hard'] as const;
export type LoadType = (typeof LOAD_TYPES)[number];

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

// ============================================================
// Type-specific data (discriminated unions)
// ============================================================

export interface IntervalBlock {
  repeat: number;
  distance_m?: number;
  duration_seconds?: number;
  pace?: string;
  rest_seconds?: number;
  description?: string;
}

export interface RunData {
  type: 'run';
  pace_target?: string;
  hr_zone?: number;
  intervals?: IntervalBlock[];
  terrain?: 'road' | 'trail' | 'track' | 'treadmill';
  elevation_gain_m?: number;
}

export interface CyclingData {
  type: 'cycling';
  avg_speed_target_kmh?: number;
  hr_zone?: number;
  terrain?: 'road' | 'gravel' | 'mtb' | 'indoor';
  elevation_gain_m?: number;
  power_target_watts?: number;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number | string;
  weight_kg?: number;
  rest_seconds?: number;
  notes?: string;
}

export interface StrengthData {
  type: 'strength';
  variantId?: string;
  exercises?: Exercise[];
  muscle_groups?: string[];
  equipment?: string[];
}

// ── Strength Variant ────────────────────────────────────────────────────────

export type LoadUnit = 'kg' | 'sec';

export interface StrengthVariantExercise {
  id: string;
  variantId: string;
  name: string;
  videoUrl: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  loadUnit: LoadUnit;
  sortOrder: number;
  supersetGroup: number | null;
  createdAt: string;
}

export interface StrengthVariant {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  exercises: StrengthVariantExercise[];
  createdAt: string;
  updatedAt: string;
}

// ── Session Exercise Log ─────────────────────────────────────────────────────

export type ProgressionIntent = 'up' | 'maintain' | 'down';

export interface SetEntry {
  reps: number | null;
  loadKg: number | null;
}

export interface StrengthSessionExercise {
  id: string;
  sessionId: string;
  variantExerciseId: string | null;
  actualReps: number | null;
  loadKg: number | null;
  progression: ProgressionIntent | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  setsData: SetEntry[];
}

// ── Progress Chart ────────────────────────────────────────────────────────────

export interface ProgressLog {
  id: string;
  sessionId: string;
  sessionDate: string;
  exerciseId: string;
  exerciseName: string;
  actualReps: number | null;
  loadKg: number | null;
  progression: ProgressionIntent | null;
  sets: number;
}

// ── Input Types ──────────────────────────────────────────────────────────────

export interface CreateStrengthVariantInput {
  name: string;
  description?: string;
  exercises: Array<{
    name: string;
    videoUrl?: string;
    sets: number;
    repsMin: number;
    repsMax: number;
    loadUnit?: LoadUnit;
    sortOrder: number;
    supersetGroup?: number | null;
  }>;
}

export interface UpdateStrengthVariantInput {
  id: string;
  name?: string;
  description?: string | null;
}

export interface UpsertVariantExercisesInput {
  variantId: string;
  exercises: Array<{
    id?: string;
    name: string;
    videoUrl?: string | null;
    sets: number;
    repsMin: number;
    repsMax: number;
    loadUnit?: LoadUnit;
    sortOrder: number;
    supersetGroup?: number | null;
  }>;
}

export interface UpsertSessionExercisesInput {
  sessionId: string;
  exercises: Array<{
    variantExerciseId: string;
    actualReps?: number | null;
    loadKg?: number | null;
    progression?: ProgressionIntent | null;
    notes?: string | null;
    sortOrder: number;
    setsData?: SetEntry[];
  }>;
}

export interface YogaMobilityData {
  type: 'yoga' | 'mobility';
  focus_area?: string;
  style?: string;
  poses?: string[];
}

export interface SwimmingData {
  type: 'swimming';
  laps?: number;
  pool_length_m?: number;
  stroke_type?:
    | 'freestyle'
    | 'backstroke'
    | 'breaststroke'
    | 'butterfly'
    | 'mixed';
  drill_description?: string;
}

export interface RestDayData {
  type: 'rest_day';
  activity_suggestion?: string;
}

export interface WalkData {
  type: 'walk';
  terrain?: 'road' | 'trail' | 'urban';
  elevation_gain_m?: number;
}

export interface HikeData {
  type: 'hike';
  terrain?: 'road' | 'trail' | 'urban';
  elevation_gain_m?: number;
}

export interface OtherData {
  type: 'other';
}

export type TypeSpecificData =
  | RunData
  | CyclingData
  | StrengthData
  | YogaMobilityData
  | SwimmingData
  | WalkData
  | HikeData
  | RestDayData
  | OtherData;

// ============================================================
// Core domain types
// ============================================================

export interface WeekPlan {
  id: string;
  athleteId: string;
  weekStart: string;
  year: number;
  weekNumber: number;
  loadType: LoadType | null;
  totalPlannedKm: number | null;
  description: string | null;
  coachComments: string | null;
  actualTotalKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingSession {
  id: string;
  weekPlanId: string;
  dayOfWeek: DayOfWeek;
  sortOrder: number;
  trainingType: TrainingType;
  description: string | null;
  coachComments: string | null;
  plannedDurationMinutes: number | null;
  plannedDistanceKm: number | null;
  typeSpecificData: TypeSpecificData;
  isCompleted: boolean;
  completedAt: string | null;
  actualDurationMinutes: number | null;
  actualDistanceKm: number | null;
  actualPace: string | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  rpe: number | null;
  coachPostFeedback: string | null;
  athleteNotes: string | null;
  stravaActivityId: number | null;
  stravaSyncedAt: string | null;
  isStravaConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Composed view types
// ============================================================

export type SessionsByDay = Record<DayOfWeek, TrainingSession[]>;

export interface WeekStats {
  totalSessions: number;
  completedSessions: number;
  totalPlannedKm: number;
  totalCompletedKm: number;
  completionPercentage: number;
  totalActualDurationMinutes: number;
  totalActualRunKm: number;
}

export interface WeekViewData {
  weekPlan: WeekPlan;
  sessionsByDay: SessionsByDay;
  stats: WeekStats;
}

// ============================================================
// Form/mutation input types
// ============================================================

export interface CreateWeekPlanInput {
  athleteId: string;
  weekStart: string;
  year: number;
  weekNumber: number;
  loadType?: LoadType;
  totalPlannedKm?: number;
  description?: string;
  coachComments?: string;
}

export interface UpdateWeekPlanInput {
  id: string;
  loadType?: LoadType | null;
  totalPlannedKm?: number | null;
  description?: string | null;
  coachComments?: string | null;
  actualTotalKm?: number | null;
}

export interface CreateSessionInput {
  weekPlanId: string;
  dayOfWeek: DayOfWeek;
  trainingType: TrainingType;
  description?: string;
  coachComments?: string;
  plannedDurationMinutes?: number;
  plannedDistanceKm?: number;
  typeSpecificData?: TypeSpecificData;
  sortOrder?: number;
  actualDurationMinutes?: number;
  actualDistanceKm?: number;
  actualPace?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  rpe?: number;
  coachPostFeedback?: string;
  isCompleted?: boolean;
  completedAt?: string;
  athleteNotes?: string;
}

export interface UpdateSessionInput {
  id: string;
  trainingType?: TrainingType;
  dayOfWeek?: DayOfWeek;
  description?: string | null;
  coachComments?: string | null;
  plannedDurationMinutes?: number | null;
  plannedDistanceKm?: number | null;
  typeSpecificData?: TypeSpecificData;
  sortOrder?: number;
  actualDurationMinutes?: number | null;
  actualDistanceKm?: number | null;
  actualPace?: string | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  rpe?: number | null;
  coachPostFeedback?: string | null;
}

export interface AthleteSessionUpdate {
  id: string;
  isCompleted?: boolean;
  athleteNotes?: string | null;
  actualDurationMinutes?: number | null;
  actualDistanceKm?: number | null;
  actualPace?: string | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  rpe?: number | null;
}

// ============================================================
// Multi-week planning — copy and reorder input types
// ============================================================

export interface CopyWeekInput {
  sourceWeekPlanId: string;
  targetWeekPlanId: string;
}

export interface CopyDayInput {
  sourceWeekPlanId: string;
  sourceDay: DayOfWeek;
  targetWeekPlanId: string;
  targetDay: DayOfWeek;
}

export interface ReorderSessionInput {
  sessionId: string;
  dayOfWeek: DayOfWeek;
  sortOrder: number;
}

export interface HistoryWeek {
  weekId: string;
  weekPlan: WeekPlan | null;
  sessions: TrainingSession[];
}

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
  'rest_day',
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
  exercises?: Exercise[];
  muscle_groups?: string[];
  equipment?: string[];
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

export type TypeSpecificData =
  | RunData
  | CyclingData
  | StrengthData
  | YogaMobilityData
  | SwimmingData
  | RestDayData;

// ============================================================
// Core domain types
// ============================================================

export interface WeekPlan {
  id: string;
  weekStart: string;
  year: number;
  weekNumber: number;
  loadType: LoadType | null;
  totalPlannedKm: number | null;
  description: string | null;
  coachComments: string | null;
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
  traineeNotes: string | null;
  stravaActivityId: number | null;
  stravaSyncedAt: string | null;
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
}

export interface UpdateSessionInput {
  id: string;
  trainingType?: TrainingType;
  description?: string | null;
  coachComments?: string | null;
  plannedDurationMinutes?: number | null;
  plannedDistanceKm?: number | null;
  typeSpecificData?: TypeSpecificData;
  sortOrder?: number;
}

export interface TraineeSessionUpdate {
  id: string;
  isCompleted?: boolean;
  traineeNotes?: string | null;
}

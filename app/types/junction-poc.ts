// PoC: Junction Garmin integration — remove after evaluation

export interface JunctionPocConnection {
  id: string;
  appUserId: string;
  junctionUserId: string;
  connectedAt: string;
  status: 'active' | 'disconnected';
  disconnectedAt: string | null;
}

export interface JunctionPocEvent {
  id: string;
  junctionUserId: string;
  svixEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

/** Maps Garmin/Junction sport slugs to Synek training types. */
export const JUNCTION_SPORT_MAP: Record<string, string> = {
  running: 'run',
  trail_running: 'run',
  outdoor_running: 'run',
  treadmill_running: 'run',
  cycling: 'cycling',
  outdoor_cycling: 'cycling',
  indoor_cycling: 'cycling',
  strength_training: 'strength',
  yoga: 'yoga',
  swimming: 'swimming',
  pool_swimming: 'swimming',
  open_water_swimming: 'swimming',
  mobility: 'mobility',
  stretching: 'mobility',
  pilates: 'pilates',
  elliptical: 'elliptical',
};

export interface JunctionPocWorkout {
  id: string;
  appUserId: string;
  junctionWorkoutId: string;
  title: string | null;
  sportSlug: string | null;
  calendarDate: string; // YYYY-MM-DD
  movingTimeSeconds: number | null;
  distanceMeters: number | null;
  calories: number | null;
  averageHr: number | null;
  maxHr: number | null;
  averageSpeed: number | null; // m/s
}

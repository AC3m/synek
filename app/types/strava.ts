export interface StravaActivity {
  id: string;
  stravaId: number;
  trainingSessionId: string | null;
  name: string | null;
  activityType: string | null;
  startDate: string | null;
  movingTimeSeconds: number | null;
  elapsedTimeSeconds: number | null;
  distanceMeters: number | null;
  totalElevationGain: number | null;
  averageSpeed: number | null;
  maxSpeed: number | null;
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  calories: number | null;
  sufferScore: number | null;
  averagePacePerKm: string | null;
  rawData: Record<string, unknown>;
}

export interface StravaToken {
  id: string;
  userId: string;
  stravaAthleteId: number;
  stravaAthleteName: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StravaConnectionStatus {
  connected: boolean;
  stravaAthleteName: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

export type StravaLapSegmentType = 'warmup' | 'interval' | 'recovery' | 'cooldown';

export interface StravaLap {
  id: string;
  lapIndex: number;
  name: string | null;
  intensity: 'active' | 'rest' | null;
  segmentType: StravaLapSegmentType;
  distanceMeters: number | null;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  averageSpeed: number | null;       // m/s — convert to min/km for display
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  averageCadence: number | null;
  paceZone: number | null;           // 1–5; fallback when averageHeartrate is null
}


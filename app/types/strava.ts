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

export interface StravaDataPlaceholder {
  trainingTime: string | null;
  avgHR: number | null;
  maxHR: number | null;
  fatigue: number | null;
  distance: number | null;
  pace: string | null;
  duration: string | null;
}

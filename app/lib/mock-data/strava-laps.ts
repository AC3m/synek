import type { StravaLap } from '~/types/strava';

// ─── Seed data ────────────────────────────────────────────────────────────────

// Scenario (a): structured interval session — WU + 3 active intervals + 2 recoveries + CD
// Maps to session 's-w10-a1-3' (6x1km interval run — mock uses 3 intervals for brevity)
const STRUCTURED_SESSION_ID = 's-w10-a1-3';

const STRUCTURED_SEED: StravaLap[] = [
  {
    id: 'lap-1',
    lapIndex: 0,
    name: 'Warm Up',
    intensity: 'active',
    segmentType: 'warmup',
    distanceMeters: 1500,
    elapsedTimeSeconds: 480,
    movingTimeSeconds: 480,
    averageSpeed: 3.125, // ~8:00/km
    averageHeartrate: 138,
    maxHeartrate: 148,
    averageCadence: 170,
    paceZone: 2,
  },
  {
    id: 'lap-2',
    lapIndex: 1,
    name: 'Interval 1',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 255,
    movingTimeSeconds: 255,
    averageSpeed: 3.922, // ~4:15/km
    averageHeartrate: 172,
    maxHeartrate: 178,
    averageCadence: 186,
    paceZone: 5,
  },
  {
    id: 'lap-3',
    lapIndex: 2,
    name: 'Recovery 1',
    intensity: 'rest',
    segmentType: 'recovery',
    distanceMeters: 500,
    elapsedTimeSeconds: 180,
    movingTimeSeconds: 180,
    averageSpeed: 2.778, // ~6:00/km
    averageHeartrate: 155,
    maxHeartrate: 165,
    averageCadence: 174,
    paceZone: 3,
  },
  {
    id: 'lap-4',
    lapIndex: 3,
    name: 'Interval 2',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 258,
    movingTimeSeconds: 258,
    averageSpeed: 3.876, // ~4:18/km
    averageHeartrate: 175,
    maxHeartrate: 181,
    averageCadence: 185,
    paceZone: 5,
  },
  {
    id: 'lap-5',
    lapIndex: 4,
    name: 'Recovery 2',
    intensity: 'rest',
    segmentType: 'recovery',
    distanceMeters: 500,
    elapsedTimeSeconds: 185,
    movingTimeSeconds: 185,
    averageSpeed: 2.703, // ~6:10/km
    averageHeartrate: 158,
    maxHeartrate: 168,
    averageCadence: 173,
    paceZone: 3,
  },
  {
    id: 'lap-6',
    lapIndex: 5,
    name: 'Interval 3',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 252,
    movingTimeSeconds: 252,
    averageSpeed: 3.968, // ~4:12/km
    averageHeartrate: 178,
    maxHeartrate: 184,
    averageCadence: 188,
    paceZone: 5,
  },
  {
    id: 'lap-7',
    lapIndex: 6,
    name: 'Cool Down',
    intensity: 'active',
    segmentType: 'cooldown',
    distanceMeters: 1200,
    elapsedTimeSeconds: 420,
    movingTimeSeconds: 420,
    averageSpeed: 2.857, // ~5:50/km
    averageHeartrate: 145,
    maxHeartrate: 158,
    averageCadence: 172,
    paceZone: 2,
  },
];

// Scenario (b): no laps — regular run, no Strava structured data
// (no session ID key; fetchSessionLaps returns [] for unknown sessions)

// Scenario (c): auto-laps only — workout_type=3 but all laps are 'active'
const AUTO_LAP_SESSION_ID = 'strava-auto-lap-session';

const AUTO_LAP_SEED: StravaLap[] = [
  {
    id: 'auto-lap-1',
    lapIndex: 0,
    name: 'Lap 1',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 330,
    movingTimeSeconds: 330,
    averageSpeed: 3.03,
    averageHeartrate: null,
    maxHeartrate: null,
    averageCadence: null,
    paceZone: 3,
  },
  {
    id: 'auto-lap-2',
    lapIndex: 1,
    name: 'Lap 2',
    intensity: 'active',
    segmentType: 'interval',
    distanceMeters: 1000,
    elapsedTimeSeconds: 328,
    movingTimeSeconds: 328,
    averageSpeed: 3.05,
    averageHeartrate: null,
    maxHeartrate: null,
    averageCadence: null,
    paceZone: 3,
  },
];

// ─── In-memory store ──────────────────────────────────────────────────────────

let mockLapStore: Map<string, StravaLap[]> = new Map();

function buildStore(): Map<string, StravaLap[]> {
  const store = new Map<string, StravaLap[]>();
  store.set(
    STRUCTURED_SESSION_ID,
    STRUCTURED_SEED.map((l) => ({ ...l })),
  );
  store.set(
    AUTO_LAP_SESSION_ID,
    AUTO_LAP_SEED.map((l) => ({ ...l })),
  );
  return store;
}

mockLapStore = buildStore();

export function resetMockLaps(): void {
  mockLapStore = buildStore();
}

function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockFetchSessionLaps(sessionId: string): Promise<StravaLap[]> {
  await delay();
  return (mockLapStore.get(sessionId) ?? []).map((l) => ({ ...l }));
}

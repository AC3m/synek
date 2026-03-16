// PoC: Junction Garmin integration — remove after evaluation
import { JUNCTION_SPORT_MAP } from '~/types/junction-poc';
import type { JunctionPocConnection, JunctionPocWorkout } from '~/types/junction-poc';

let mockConnection: JunctionPocConnection | null = null;

export function resetMockJunctionPoc() {
  mockConnection = null;
}

export function getMockJunctionConnection(appUserId: string): JunctionPocConnection | null {
  if (!mockConnection) return null;
  return mockConnection.appUserId === appUserId ? mockConnection : null;
}

export function setMockJunctionConnection(connection: JunctionPocConnection) {
  mockConnection = { ...connection };
}

export function mockCreateJunctionConnection(
  appUserId: string,
  junctionUserId: string,
): JunctionPocConnection {
  const connection: JunctionPocConnection = {
    id: `mock-junction-conn-${appUserId}`,
    appUserId,
    junctionUserId,
    connectedAt: new Date().toISOString(),
    status: 'active',
    disconnectedAt: null,
  };
  mockConnection = connection;
  return connection;
}

export function mockDisconnectJunctionConnection(appUserId: string): void {
  if (mockConnection?.appUserId === appUserId) {
    mockConnection = {
      ...mockConnection,
      status: 'disconnected',
      disconnectedAt: new Date().toISOString(),
    };
  }
}

// ── Mock workouts ────────────────────────────────────────────────────────────

const MOCK_JUNCTION_WORKOUTS: JunctionPocWorkout[] = [
  {
    id: 'mock-junction-workout-1',
    appUserId: 'mock-user-1',
    junctionWorkoutId: 'garmin-workout-001',
    title: 'Morning Run',
    sportSlug: 'running',
    calendarDate: '2026-03-10',
    movingTimeSeconds: 3240,
    distanceMeters: 8050,
    calories: 620,
    averageHr: 142,
    maxHr: 168,
    averageSpeed: 2.49,
  },
  {
    id: 'mock-junction-workout-2',
    appUserId: 'mock-user-1',
    junctionWorkoutId: 'garmin-workout-002',
    title: 'Strength Session',
    sportSlug: 'strength_training',
    calendarDate: '2026-03-12',
    movingTimeSeconds: 3600,
    distanceMeters: null,
    calories: 310,
    averageHr: 118,
    maxHr: 145,
    averageSpeed: null,
  },
];

export function getMockJunctionWorkoutForSession(
  appUserId: string,
  calendarDate: string,
  trainingType: string,
): JunctionPocWorkout | null {
  return (
    MOCK_JUNCTION_WORKOUTS.find(
      (w) =>
        w.appUserId === appUserId &&
        w.calendarDate === calendarDate &&
        w.sportSlug !== null &&
        JUNCTION_SPORT_MAP[w.sportSlug] === trainingType,
    ) ?? null
  );
}

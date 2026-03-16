// PoC: Junction Garmin integration — remove after evaluation
import type { JunctionPocConnection } from '~/types/junction-poc';

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

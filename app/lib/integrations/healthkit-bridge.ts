import { z } from 'zod';
import type { HealthKitWorkoutPayload } from '~/types/healthkit';

// ============================================================
// Bridge type wiring (window.__healthkit)
// ============================================================

interface BridgeError {
  code:
    | 'permission_denied'
    | 'permission_not_determined'
    | 'hk_unavailable'
    | 'invalid_args'
    | 'internal';
  message: string;
}

interface HealthKitBridge {
  call(action: string, args?: Record<string, unknown>): Promise<unknown>;
  _resolve(requestId: string, ok: unknown | null, err: BridgeError | null): void;
}

declare global {
  interface Window {
    __healthkit?: HealthKitBridge;
  }
}

export class HealthKitBridgeUnavailableError extends Error {
  constructor() {
    super('HealthKit bridge unavailable (not running inside iOS app)');
    this.name = 'HealthKitBridgeUnavailableError';
  }
}

export class HealthKitBridgeError extends Error {
  constructor(
    public readonly code: BridgeError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'HealthKitBridgeError';
  }
}

export function isHealthKitBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.__healthkit !== 'undefined';
}

function getBridge(): HealthKitBridge {
  if (!isHealthKitBridgeAvailable()) throw new HealthKitBridgeUnavailableError();
  return window.__healthkit!;
}

async function call<T>(
  action: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    const raw = await getBridge().call(action, args);
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof HealthKitBridgeUnavailableError) throw err;
    if (err instanceof Error && 'code' in err) {
      const code = (err as { code?: unknown }).code;
      if (typeof code === 'string') {
        throw new HealthKitBridgeError(code as BridgeError['code'], err.message);
      }
    }
    throw err;
  }
}

// ============================================================
// Schemas (mirror contracts/healthkit-bridge.md)
// ============================================================

const RequestAuthResult = z.object({ granted: z.boolean() });

const Workout = z.object({
  hkUuid: z.string().min(1),
  activityId: z.string().min(1),
  hkActivityType: z.number().int(),
  sourceName: z.string().nullable(),
  sourceBundleId: z.string().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  durationSeconds: z.number().nullable(),
  distanceMeters: z.number().nullable(),
  activeEnergyKcal: z.number().nullable(),
  averageHeartrate: z.number().nullable(),
  maxHeartrate: z.number().nullable(),
  raw: z.record(z.string(), z.unknown()).nullable(),
}) satisfies z.ZodType<HealthKitWorkoutPayload>;

const FetchWorkoutsResult = z.object({ workouts: z.array(Workout) });

const StatusResult = z.object({
  available: z.boolean(),
  permission: z.enum(['granted', 'denied', 'not_determined']),
});

const AppInfoResult = z.object({
  version: z.string(),
  build: z.string(),
  os: z.string(),
});

// ============================================================
// Public API
// ============================================================

export async function requestHealthKitAuth(): Promise<{ granted: boolean }> {
  return call('requestAuth', RequestAuthResult);
}

export async function fetchHealthKitWorkouts(sinceMs: number): Promise<HealthKitWorkoutPayload[]> {
  const result = await call('fetchWorkouts', FetchWorkoutsResult, { sinceMs });
  return result.workouts;
}

export async function getHealthKitDeviceStatus(): Promise<{
  available: boolean;
  permission: 'granted' | 'denied' | 'not_determined';
}> {
  return call('getStatus', StatusResult);
}

export async function getHealthKitAppInfo(): Promise<{
  version: string;
  build: string;
  os: string;
}> {
  return call('getAppInfo', AppInfoResult);
}

import type { StravaLapSegmentType } from '~/types/strava';

export interface RawLap {
  lapIndex: number;
  name?: string | null;
  intensity?: 'active' | 'rest' | null;
}

export interface ClassifiedLap extends RawLap {
  segmentType: StravaLapSegmentType;
}

/** Convert Strava average speed (m/s) to a human-readable pace string. */
export function formatPaceSpeed(averageSpeed: number | null, suffix = ''): string {
  if (!averageSpeed || averageSpeed <= 0) return '—';
  const secPerKm = 1000 / averageSpeed;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}${suffix}`;
}

/**
 * Classify raw Strava laps into warmup / interval / recovery / cooldown segments.
 *
 * NOTE: The production version of this logic runs inside the `strava-fetch-laps` edge
 * function (Deno), which cannot import from this file. This copy exists solely so the
 * algorithm can be unit-tested. If you change the classification logic, update the
 * edge function (`supabase/functions/strava-fetch-laps/index.ts`) in sync.
 *
 * Step 1 — name-based (authoritative when device provides labels):
 *   - name contains "warm" or "wu"  → warmup
 *   - name contains "cool" or "cd"  → cooldown
 *
 * Step 2 — position heuristic (fallback when names are absent):
 *   - Find first and last rest lap index
 *   - Active laps before first rest → warmup
 *   - Active laps after last rest   → cooldown
 *   - Active laps between           → interval
 *   - Rest laps                     → recovery
 *
 * If there are no rest laps, all laps are classified as 'interval'
 * (callers should suppress the interval affordance in this case).
 */
export function classifyLaps<T extends RawLap>(rawLaps: T[]): Array<T & { segmentType: StravaLapSegmentType }> {
  if (rawLaps.length === 0) return [];

  const hasRestLap = rawLaps.some((l) => l.intensity === 'rest');

  // Step 1: Name-based classification
  // - "warm"/"wu" → warmup; "cool"/"cd" → cooldown (device-authoritative names)
  // - Any other non-empty device name: classify by intensity directly
  //   (avoids misclassifying named "Interval N" laps via the position heuristic)
  // - Empty/absent name: fall through to position heuristic (Step 2)
  const afterNamePass = rawLaps.map((lap) => {
    const nameLower = (lap.name ?? '').toLowerCase().trim();

    if (nameLower.includes('warm') || nameLower.includes('wu')) {
      return { ...lap, segmentType: 'warmup' as StravaLapSegmentType };
    }
    if (nameLower.includes('cool') || nameLower.includes('cd')) {
      return { ...lap, segmentType: 'cooldown' as StravaLapSegmentType };
    }
    // Named lap, but name doesn't signal WU/CD → trust intensity directly
    if (nameLower.length > 0 && hasRestLap) {
      return {
        ...lap,
        segmentType: (lap.intensity === 'rest' ? 'recovery' : 'interval') as StravaLapSegmentType,
      };
    }
    // No name (or no rest laps yet found) → defer to position heuristic
    return { ...lap, segmentType: null as unknown as StravaLapSegmentType };
  });

  // Step 2: Position heuristic for laps with no device name
  if (!hasRestLap) {
    // No rest laps — classify all as interval (caller suppresses affordance)
    return afterNamePass.map((lap) => ({
      ...lap,
      segmentType: (lap.segmentType ?? 'interval') as StravaLapSegmentType,
    }));
  }

  const restIndices = rawLaps
    .map((lap, i) => (lap.intensity === 'rest' ? i : -1))
    .filter((i) => i !== -1);

  const firstRest = restIndices[0];
  const lastRest = restIndices[restIndices.length - 1];

  return afterNamePass.map((lap, i) => {
    if (lap.segmentType !== null) return lap;

    if (lap.intensity === 'rest') {
      return { ...lap, segmentType: 'recovery' as StravaLapSegmentType };
    }
    if (i < firstRest) {
      return { ...lap, segmentType: 'warmup' as StravaLapSegmentType };
    }
    if (i > lastRest) {
      return { ...lap, segmentType: 'cooldown' as StravaLapSegmentType };
    }
    return { ...lap, segmentType: 'interval' as StravaLapSegmentType };
  });
}

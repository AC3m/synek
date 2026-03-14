import { toLap } from '~/lib/queries/strava-laps';
import { classifyLaps } from '~/lib/utils/lap-classification';

// ─── toLap() mapper ────────────────────────────────────────────────────────────

describe('toLap (row mapper)', () => {
  const baseRow: Record<string, unknown> = {
    id: 'lap-uuid-1',
    lap_index: 0,
    name: 'Warm Up',
    intensity: 'active',
    segment_type: 'warmup',
    distance_meters: 1500,
    elapsed_time_seconds: 480,
    moving_time_seconds: 478,
    average_speed: 3.125,
    average_heartrate: 138.5,
    max_heartrate: 148.0,
    average_cadence: 170.2,
    pace_zone: 2,
  };

  it('maps all snake_case DB fields to camelCase StravaLap fields', () => {
    const lap = toLap(baseRow);
    expect(lap.id).toBe('lap-uuid-1');
    expect(lap.lapIndex).toBe(0);
    expect(lap.name).toBe('Warm Up');
    expect(lap.intensity).toBe('active');
    expect(lap.segmentType).toBe('warmup');
    expect(lap.distanceMeters).toBe(1500);
    expect(lap.elapsedTimeSeconds).toBe(480);
    expect(lap.movingTimeSeconds).toBe(478);
    expect(lap.averageSpeed).toBe(3.125);
    expect(lap.averageHeartrate).toBe(138.5);
    expect(lap.maxHeartrate).toBe(148.0);
    expect(lap.averageCadence).toBe(170.2);
    expect(lap.paceZone).toBe(2);
  });

  it('maps nullable fields to null when absent', () => {
    const lap = toLap({
      ...baseRow,
      name: null,
      intensity: null,
      average_heartrate: null,
      max_heartrate: null,
      average_cadence: null,
      pace_zone: null,
    });
    expect(lap.name).toBeNull();
    expect(lap.intensity).toBeNull();
    expect(lap.averageHeartrate).toBeNull();
    expect(lap.maxHeartrate).toBeNull();
    expect(lap.averageCadence).toBeNull();
    expect(lap.paceZone).toBeNull();
  });
});

// ─── classifyLaps() ────────────────────────────────────────────────────────────

describe('classifyLaps', () => {
  it('returns empty array for empty input', () => {
    expect(classifyLaps([])).toEqual([]);
  });

  it('uses device name to classify warmup, cooldown, interval, and recovery', () => {
    // Devices like Garmin label every lap with a name.
    // "Warm Up"/"Cool Down" → by WU/CD name pattern.
    // "Interval N" (active, has a name, session has rest laps) → interval by intensity.
    // "Recovery N" (rest, has a name) → recovery by intensity.
    const laps = [
      { lapIndex: 0, name: 'Warm Up', intensity: 'active' as const },
      { lapIndex: 1, name: 'Interval 1', intensity: 'active' as const },
      { lapIndex: 2, name: 'Recovery 1', intensity: 'rest' as const },
      { lapIndex: 3, name: 'Interval 2', intensity: 'active' as const },
      { lapIndex: 4, name: 'Cool Down', intensity: 'active' as const },
    ];

    const result = classifyLaps(laps);
    expect(result[0].segmentType).toBe('warmup');   // name-based
    expect(result[1].segmentType).toBe('interval'); // active + has name + has rest lap
    expect(result[2].segmentType).toBe('recovery'); // rest + has name
    expect(result[3].segmentType).toBe('interval'); // active + has name + has rest lap
    expect(result[4].segmentType).toBe('cooldown'); // name-based
  });

  it('uses position heuristic when no device names are present', () => {
    // Active | rest | active | rest | active
    // WU     | Rec  | Int    | Rec  | CD
    const laps = [
      { lapIndex: 0, name: null, intensity: 'active' as const },
      { lapIndex: 1, name: null, intensity: 'rest' as const },
      { lapIndex: 2, name: null, intensity: 'active' as const },
      { lapIndex: 3, name: null, intensity: 'rest' as const },
      { lapIndex: 4, name: null, intensity: 'active' as const },
    ];

    const result = classifyLaps(laps);
    expect(result[0].segmentType).toBe('warmup');
    expect(result[1].segmentType).toBe('recovery');
    expect(result[2].segmentType).toBe('interval');
    expect(result[3].segmentType).toBe('recovery');
    expect(result[4].segmentType).toBe('cooldown');
  });

  it('classifies all laps as interval when there are no rest laps (auto-laps)', () => {
    const laps = [
      { lapIndex: 0, name: 'Lap 1', intensity: 'active' as const },
      { lapIndex: 1, name: 'Lap 2', intensity: 'active' as const },
      { lapIndex: 2, name: 'Lap 3', intensity: 'active' as const },
    ];

    const result = classifyLaps(laps);
    expect(result.every((l) => l.segmentType === 'interval')).toBe(true);
  });

  it('returns empty array for empty input without throwing', () => {
    const result = classifyLaps([]);
    expect(result).toHaveLength(0);
  });

  it('handles WU abbreviation in lap names', () => {
    const laps = [
      { lapIndex: 0, name: 'WU', intensity: 'active' as const },
      { lapIndex: 1, name: null, intensity: 'rest' as const },
      { lapIndex: 2, name: 'CD', intensity: 'active' as const },
    ];

    const result = classifyLaps(laps);
    expect(result[0].segmentType).toBe('warmup');
    expect(result[2].segmentType).toBe('cooldown');
  });
});

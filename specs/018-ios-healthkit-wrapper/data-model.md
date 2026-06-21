# Data Model: iOS App Wrapper with HealthKit Integration

**Feature**: 018-ios-healthkit-wrapper
**Date**: 2026-05-16

---

## New Tables (via migration `018_healthkit_schema.sql`)

### `healthkit_workouts`

One row per workout pulled from HealthKit. Primary key is the HealthKit-assigned UUID (stable per device) — guarantees idempotent re-sync.

```sql
CREATE TABLE healthkit_workouts (
  uuid                   UUID PRIMARY KEY,                                  -- HKWorkout.uuid
  user_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hk_activity_type       SMALLINT NOT NULL,                                 -- HKWorkoutActivityType.rawValue
  synek_activity_id      TEXT NOT NULL,                                     -- mapped synek training-type id
  start_at               TIMESTAMPTZ NOT NULL,
  end_at                 TIMESTAMPTZ NOT NULL,
  duration_seconds       INTEGER NOT NULL,
  distance_meters        NUMERIC(10,2),                                     -- nullable: not all activities have distance
  active_energy_kcal     NUMERIC(8,2),
  avg_heart_rate_bpm     NUMERIC(5,1),
  source_device_name     TEXT,                                              -- "Artur's Apple Watch", "iPhone", etc.
  matched_session_id     UUID REFERENCES sessions(id) ON DELETE SET NULL,   -- null if no matching planned session
  raw_payload            JSONB NOT NULL,                                    -- full normalized HK data for future-proofing
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_healthkit_workouts_user_start ON healthkit_workouts (user_id, start_at DESC);
CREATE INDEX idx_healthkit_workouts_matched ON healthkit_workouts (matched_session_id) WHERE matched_session_id IS NOT NULL;

ALTER TABLE healthkit_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY healthkit_workouts_owner_select ON healthkit_workouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy: writes only via Edge Function with service-role client.
```

### `healthkit_sync_status`

One row per user; drives the Integrations UI and incremental sync window.

```sql
CREATE TABLE healthkit_sync_status (
  user_id              UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_synced_at       TIMESTAMPTZ,                                         -- null until first successful sync
  total_synced_count   INTEGER NOT NULL DEFAULT 0,
  permission_state     TEXT NOT NULL DEFAULT 'not_determined'
                       CHECK (permission_state IN ('granted','denied','not_determined')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE healthkit_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY healthkit_sync_status_owner_select ON healthkit_sync_status
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- No INSERT/UPDATE policy: writes only via Edge Function with service-role client.
```

---

## Extended Tables

### `sessions` (extended)

Add a JSON column tracking which data sources have populated this session's actuals. Mirrors the existing Strava pattern.

```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS data_sources TEXT[] NOT NULL DEFAULT '{}';
-- Example values: ['manual'], ['strava'], ['healthkit'], ['strava','healthkit']
```

**Rationale**: When both Strava and HealthKit report data for the same session, Strava wins (current behavior) but the UI should display badges for both sources (FR-008). A simple text array is cheaper than a separate join table for a value that's almost always 0–2 entries.

---

## TypeScript Types

```typescript
// app/lib/queries/healthkit-sync.ts

export interface HealthKitWorkout {
  uuid: string; // HKWorkout.uuid (UUID v4 from device)
  hkActivityType: number; // HKWorkoutActivityType.rawValue
  synekActivityId: string; // 'run' | 'bike' | 'swim' | ...
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  durationSeconds: number;
  distanceMeters: number | null;
  activeEnergyKcal: number | null;
  avgHeartRateBpm: number | null;
  sourceDeviceName: string | null;
}

export interface HealthKitSyncStatus {
  userId: string;
  lastSyncedAt: string | null; // ISO 8601
  totalSyncedCount: number;
  permissionState: 'granted' | 'denied' | 'not_determined';
}

export interface SyncResult {
  uploaded: number; // count newly stored (excludes deduped)
  matched: number; // count matched to a planned session
  lastSyncedAt: string; // ISO 8601 — server timestamp
}
```

All snake_case → camelCase mapping happens in mapper functions inside `app/lib/queries/healthkit-sync.ts` (per Principle III).

---

## Swift Types (synek-ios)

```swift
// synek-ios/Synek/Models/HealthKitWorkout.swift

struct HealthKitWorkoutDTO: Codable {
    let uuid: String
    let hkActivityType: Int
    let synekActivityId: String
    let startAt: String           // ISO 8601 in UTC
    let endAt: String
    let durationSeconds: Int
    let distanceMeters: Double?
    let activeEnergyKcal: Double?
    let avgHeartRateBpm: Double?
    let sourceDeviceName: String?
}
```

Used both for the bridge response payload (Swift → web) and for the Edge Function POST body (web → server).

---

## Activity Type Mapping

```typescript
// app/lib/utils/healthkit-activity-map.ts

export const HK_TO_SYNEK_ACTIVITY: Record<number, string> = {
  37: 'run', // HKWorkoutActivityType.running
  52: 'walk', // HKWorkoutActivityType.walking
  35: 'hike', // HKWorkoutActivityType.hiking
  13: 'bike', // HKWorkoutActivityType.cycling
  31: 'bike', // HKWorkoutActivityType.indoorCycling
  46: 'swim', // HKWorkoutActivityType.swimming
  36: 'row', // HKWorkoutActivityType.rowing
  18: 'elliptical', // HKWorkoutActivityType.elliptical
  20: 'strength', // HKWorkoutActivityType.functionalStrengthTraining
  50: 'strength', // HKWorkoutActivityType.traditionalStrengthTraining
  57: 'yoga', // HKWorkoutActivityType.yoga
  34: 'mixed-cardio', // HKWorkoutActivityType.mixedCardio
  63: 'hiit', // HKWorkoutActivityType.highIntensityIntervalTraining
};

export const DEFAULT_SYNEK_ACTIVITY = 'other';
```

Mirrored verbatim in `synek-ios/Synek/HealthKitActivityMap.swift`.

---

## Migration File Location

`supabase/migrations/018_healthkit_schema.sql`

Includes:

- `healthkit_workouts` table + indexes + RLS
- `healthkit_sync_status` table + RLS
- `ALTER TABLE sessions ADD COLUMN data_sources`
- Backfill `data_sources = ARRAY['strava']` for any session with non-null `strava_activity_id` (preserves existing provenance)

# Data Model: Google Sheets Training Data Migration

**Phase**: 1 — Design
**Branch**: `001-sheets-data-migration`
**Date**: 2026-03-08

---

## Overview of Changes

This feature extends three layers:
1. **DB schema** — new columns on existing tables + new enum value
2. **TypeScript types** — extend `TrainingSession`, `WeekPlan`, and `TypeSpecificData`
3. **Row mappers & mock data** — extend to include new fields (default null)

No new tables are created. All changes are additive (nullable columns, new enum value).

---

## DB Migration: `009_sheets_schema_extension.sql`

### 1. Extend `training_type` enum

```sql
-- Add 'other' as a catch-all for unrecognised activity types
ALTER TYPE training_type ADD VALUE IF NOT EXISTS 'other';
```

### 2. Extend `training_sessions`

```sql
-- Actual performance data (athlete execution results)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_distance_km      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS actual_pace             TEXT,
  ADD COLUMN IF NOT EXISTS avg_heart_rate          INTEGER,
  ADD COLUMN IF NOT EXISTS max_heart_rate          INTEGER,
  ADD COLUMN IF NOT EXISTS rpe                     INTEGER CHECK (rpe >= 1 AND rpe <= 10);

-- Coach post-training feedback (writable after session is completed)
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS coach_post_feedback TEXT;
```

### 3. Extend `week_plans`

```sql
-- Realised weekly km (from KM ZREALIZOWANE in Google Sheet)
ALTER TABLE week_plans
  ADD COLUMN IF NOT EXISTS actual_total_km DECIMAL(6,2);
```

---

## TypeScript Type Changes (`app/types/training.ts`)

### `TRAINING_TYPES` constant

```typescript
export const TRAINING_TYPES = [
  'run', 'cycling', 'strength', 'yoga', 'mobility', 'swimming', 'rest_day', 'other',
] as const;
```

### `OtherData` type (new)

```typescript
export interface OtherData {
  type: 'other';
}
```

Add `OtherData` to `TypeSpecificData` union.

### `TrainingSession` interface — new fields

```typescript
// Actual performance (execution data)
actualDurationMinutes: number | null;
actualDistanceKm: number | null;
actualPace: string | null;          // text, e.g. "4:47"
avgHeartRate: number | null;
maxHeartRate: number | null;
rpe: number | null;                 // integer 1–10

// Coach post-training feedback
coachPostFeedback: string | null;
```

### `WeekPlan` interface — new field

```typescript
actualTotalKm: number | null;
```

### Input types to extend

**`UpdateSessionInput`** — add optional new fields:
```typescript
actualDurationMinutes?: number | null;
actualDistanceKm?: number | null;
actualPace?: string | null;
avgHeartRate?: number | null;
maxHeartRate?: number | null;
rpe?: number | null;
coachPostFeedback?: string | null;
```

**`UpdateWeekPlanInput`** — add:
```typescript
actualTotalKm?: number | null;
```

**`CreateSessionInput`** — add optional new fields (same as Update, minus `id`):
```typescript
actualDurationMinutes?: number;
actualDistanceKm?: number;
actualPace?: string;
avgHeartRate?: number;
maxHeartRate?: number;
rpe?: number;
coachPostFeedback?: string;
```

---

## Row Mapper Updates (`app/lib/queries/`)

### `sessions.ts` — `toSession()` mapper additions

```typescript
actualDurationMinutes: row.actual_duration_minutes as number | null,
actualDistanceKm: row.actual_distance_km as number | null,
actualPace: row.actual_pace as string | null,
avgHeartRate: row.avg_heart_rate as number | null,
maxHeartRate: row.max_heart_rate as number | null,
rpe: row.rpe as number | null,
coachPostFeedback: row.coach_post_feedback as string | null,
```

### `weeks.ts` — `toWeekPlan()` mapper addition

```typescript
actualTotalKm: row.actual_total_km as number | null,
```

---

## Zod Validation Schemas (`scripts/migrate-sheets.ts`)

### CSV Row Schema (input, all strings)

```typescript
const CsvRowSchema = z.object({
  TYDZIEŃ: z.string(),
  DATA: z.string(),
  'D.T.': z.string(),
  OPIS: z.string(),
  'UWAGI TRENERA:': z.string(),
  'UWagi trenera po wykonanym treningu': z.string(),
  'Obciążenie:': z.string(),
  'KM ZAPLANOWANE:': z.string(),
  'KM ZREALIZOWANE:': z.string(),
  'ŁĄCZNY CZAS TRENINGU Z CAŁEGO TYGODNIA:': z.string(),
  'ŁĄCZNY CZAS TRENINGU Z DANEGO DNIA': z.string(),
  'TĘTNO ŚREDNIE': z.string(),
  'TĘTNO MAX': z.string(),
  'ZMĘCZENIE 1-10': z.string(),
  CZAS: z.string(),
  DYSTANS: z.string(),
  TEMPO: z.string(),
  RODZAJ: z.string(),
  'UWAGI ZAWODNIKA:': z.string(),
  'Waga:': z.string(),
});
```

### Validated Session Schema (output, typed)

```typescript
const ValidatedSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  trainingType: z.enum(['run','cycling','strength','yoga','mobility','swimming','rest_day','other']),
  description: z.string().nullable(),
  coachComments: z.string().nullable(),
  coachPostFeedback: z.string().nullable(),
  actualDurationMinutes: z.number().int().positive().nullable(),
  actualDistanceKm: z.number().positive().nullable(),
  actualPace: z.string().nullable(),
  avgHeartRate: z.number().int().positive().nullable(),
  maxHeartRate: z.number().int().positive().nullable(),
  rpe: z.number().int().min(1).max(10).nullable(),
  athleteNotes: z.string().nullable(),
  isCompleted: z.boolean(),
  sortOrder: z.number().int().min(0),
});
```

### Validated Week Schema (output)

```typescript
const ValidatedWeekSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  year: z.number().int(),
  weekNumber: z.number().int().min(1).max(53),
  loadType: z.enum(['easy','medium','hard']).nullable(),
  totalPlannedKm: z.number().positive().nullable(),
  actualTotalKm: z.number().positive().nullable(),
  coachComments: z.string().nullable(),
});
```

---

## Training Type Config (`app/lib/utils/training-types.ts`)

New entry for `other`:

```typescript
other: {
  color: 'text-slate-600',
  bgColor: 'bg-slate-100',
  icon: 'Activity',
}
```

Lucide icon: `Activity` (generic activity waveform).

---

## i18n Keys to Add

### `app/i18n/resources/en/common.json`

```json
"trainingTypes": {
  ...existing...,
  "other": "Other"
}
```

### `app/i18n/resources/pl/common.json`

```json
"trainingTypes": {
  ...existing...,
  "other": "Inne"
}
```

### `app/i18n/resources/en/training.json`

```json
"actualPerformance": {
  "title": "Actual Performance",
  "duration": "Duration",
  "distance": "Distance",
  "pace": "Pace",
  "avgHr": "Avg HR",
  "maxHr": "Max HR",
  "rpe": "RPE"
},
"coachPostFeedback": {
  "label": "Post-Training Coach Notes",
  "placeholder": "Add post-training feedback...",
  "empty": "No post-training feedback yet."
}
```

### `app/i18n/resources/pl/training.json`

```json
"actualPerformance": {
  "title": "Wykonanie",
  "duration": "Czas",
  "distance": "Dystans",
  "pace": "Tempo",
  "avgHr": "Śr. tętno",
  "maxHr": "Maks. tętno",
  "rpe": "RPE"
},
"coachPostFeedback": {
  "label": "Komentarz trenera po treningu",
  "placeholder": "Dodaj komentarz po treningu...",
  "empty": "Brak komentarza po treningu."
}
```

### `app/i18n/resources/en/coach.json` — remove `description` key

Remove `weekSummary.description` and `weekSummary.descriptionPlaceholder` (Training Focus).

### `app/i18n/resources/pl/coach.json` — same

---

## Mock Data Updates (`app/lib/mock-data.ts`)

All existing mock `TrainingSession` and `WeekPlan` objects need new fields added with `null` defaults. No new seed rows needed — the migration script populates real data.

```typescript
// On each TrainingSession in mock data:
actualDurationMinutes: null,
actualDistanceKm: null,
actualPace: null,
avgHeartRate: null,
maxHeartRate: null,
rpe: null,
coachPostFeedback: null,

// On each WeekPlan in mock data:
actualTotalKm: null,
```

---

## Migration Script Structure (`scripts/migrate-sheets.ts`)

```
scripts/
└── migrate-sheets.ts    # One-shot migration: CSV → Supabase
```

**Pipeline**:
```
readFile('.data/googleSheetData.csv')
  → papaparse.parse() with header: true
  → groupRowsByWeek()          // group by derived weekStart
  → for each week:
      validateWeek()           // Zod ValidatedWeekSchema
      upsertWeekPlan()         // INSERT ... ON CONFLICT (athlete_id, week_start) DO UPDATE
      → for each day in week:
          detectMultiActivity()  // split combined activities into separate rows
          → for each activity:
              validateSession()  // Zod ValidatedSessionSchema
              insertSession()    // SELECT existing → skip if found, else INSERT
  → printSummary()             // weeks created, sessions created, rows skipped
```

**Required env vars**:
```
VITE_SUPABASE_URL        # copied from .env
SUPABASE_SERVICE_ROLE_KEY  # service-role key (bypasses RLS for migration)
ATHLETE_ID               # Supabase auth.users UUID for the target athlete
```

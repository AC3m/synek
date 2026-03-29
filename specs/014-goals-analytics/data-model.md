# Data Model: Goal Management & Analytics Dashboard

**Feature**: 014-goals-analytics
**Date**: 2026-03-28

## New Entities

### Goal

Represents a competition target set by a coach or self-plan athlete.

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| id | UUID | no | PK, auto-generated |
| athlete_id | UUID | no | FK → auth.users(id), ON DELETE CASCADE |
| created_by | UUID | no | FK → auth.users(id), ON DELETE SET NULL — the coach or self-plan athlete who created it |
| name | text | no | e.g. "Spring 10K", "City Marathon" |
| discipline | training_type | no | Uses existing enum — the sport of the competition |
| competition_date | date | no | The date of the competition event |
| preparation_weeks | integer | no | Number of weeks leading up to competition (0 = competition day only) |
| goal_distance_km | decimal(8,2) | yes | Target distance (for distance-based sports) |
| goal_time_seconds | integer | yes | Target finish time in seconds (for time-based goals) |
| notes | text | yes | Free-text description or context |
| created_at | timestamptz | no | Default NOW() |
| updated_at | timestamptz | no | Default NOW(), auto-updated via trigger |

**Constraints**:
- `CHECK (preparation_weeks >= 0)`
- `CHECK (goal_distance_km > 0 OR goal_distance_km IS NULL)`
- `CHECK (goal_time_seconds > 0 OR goal_time_seconds IS NULL)`
- Index on `(athlete_id, competition_date)`

**RLS policies**:
- SELECT: athlete can read own goals; coach can read goals of athletes they coach
- INSERT: coach can create for their athletes; athlete can create for self if self-plan enabled
- UPDATE: same as INSERT (creator or authorized user)
- DELETE: same as INSERT

### Competition Session Extension (on existing `training_sessions`)

Rather than a new table, competition sessions are regular `training_sessions` rows with:

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| goal_id | UUID | yes | FK → goals(id), ON DELETE SET NULL — links session to its goal |

When `goal_id IS NOT NULL`, the session is treated as a competition session. The `training_type` field uses the existing enum value matching the goal's discipline (e.g. `'run'` for a running competition).

**Why not a new `competition` training type?** After research, adding `competition` to the `training_type` enum would break existing queries that aggregate by sport (e.g. "total running distance"). A running competition should still be `type = 'run'` but with `goal_id` set. The `goal_id` presence is the discriminator. The UI checks `goal_id IS NOT NULL` to apply competition styling.

**Additional fields on `training_sessions`** (added via migration):

| Field | Type | Nullable | Notes |
|-------|------|----------|-------|
| result_distance_km | decimal(8,2) | yes | Actual competition distance |
| result_time_seconds | integer | yes | Actual finish time |
| result_pace | text | yes | Formatted pace string (e.g. "4:30/km") |

These fields are only meaningful when `goal_id IS NOT NULL`. For regular training sessions they remain NULL.

**Index**: `idx_training_sessions_goal ON training_sessions(goal_id) WHERE goal_id IS NOT NULL`

## Extended Entities

### TrainingSession (TypeScript type extension)

```
TrainingSession {
  ...existing fields...
  goalId: string | null          // FK to Goal
  resultDistanceKm: number | null
  resultTimeSeconds: number | null
  resultPace: string | null
}
```

### WeekStats (TypeScript type extension)

```
WeekStats {
  ...existing fields...
  byType: Record<TrainingType, SportBreakdownEntry>
  competitionSessions: CompetitionSummary[]
}

SportBreakdownEntry {
  sessionCount: number
  plannedDistanceKm: number
  actualDistanceKm: number
  totalDurationMinutes: number
}

CompetitionSummary {
  sessionId: string
  goalId: string
  goalName: string
  discipline: TrainingType
  goalDistanceKm: number | null
  resultDistanceKm: number | null
  resultTimeSeconds: number | null
  achievementStatus: 'achieved' | 'missed' | 'pending'
}
```

## New TypeScript Types

### Goal

```
Goal {
  id: string
  athleteId: string
  createdBy: string
  name: string
  discipline: TrainingType
  competitionDate: string         // ISO date YYYY-MM-DD
  preparationWeeks: number
  goalDistanceKm: number | null
  goalTimeSeconds: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
```

### Input Types

```
CreateGoalInput {
  athleteId: string
  name: string
  discipline: TrainingType
  competitionDate: string
  preparationWeeks: number
  goalDistanceKm?: number
  goalTimeSeconds?: number
  notes?: string
}

UpdateGoalInput {
  id: string
  name?: string
  discipline?: TrainingType
  competitionDate?: string
  preparationWeeks?: number
  goalDistanceKm?: number | null
  goalTimeSeconds?: number | null
  notes?: string | null
}
```

### Analytics Period Types

```
AnalyticsPeriod = 'year' | 'quarter' | 'month' | 'goal'

AnalyticsParams {
  athleteId: string
  period: AnalyticsPeriod
  goalId?: string              // Required when period = 'goal'
  trainingType?: TrainingType  // Sport filter (omit for all sports)
}

AnalyticsBucket {
  label: string               // e.g. "Jan", "W10", "Mon"
  startDate: string
  endDate: string
  totalSessions: number
  completedSessions: number
  totalDistanceKm: number
  totalDurationMinutes: number
  completionRate: number       // 0–100
}

AnalyticsResponse {
  buckets: AnalyticsBucket[]
  competitions: CompetitionMilestone[]
  totals: {
    totalSessions: number
    completedSessions: number
    totalDistanceKm: number
    totalDurationMinutes: number
    overallCompletionRate: number
  }
}

CompetitionMilestone {
  goalId: string
  goalName: string
  discipline: TrainingType
  competitionDate: string
  goalDistanceKm: number | null
  goalTimeSeconds: number | null
  resultDistanceKm: number | null
  resultTimeSeconds: number | null
  achievementStatus: 'achieved' | 'missed' | 'pending'
}
```

## Relationships

```
Goal (1) ←→ (0..1) TrainingSession  [via training_sessions.goal_id]
Goal (1) ←→ (N) WeekPlan            [computed: weeks where week_start falls in prep window]
auth.users (1) ←→ (N) Goal          [via goals.athlete_id]
```

## State Transitions

### Goal Lifecycle

```
Created → Active (prep weeks in progress)
  ├→ Competition Day (competition session exists, result pending)
  │   ├→ Achieved (result meets/exceeds target)
  │   └→ Missed (result below target)
  └→ Deleted (cascade removes competition session link)
```

Achievement status is computed (not stored), derived from comparing `result_distance_km` / `result_time_seconds` against `goal_distance_km` / `goal_time_seconds`.

## Query Key Extensions

```
queryKeys.goals = {
  all: ['goals'] as const,
  byAthlete: (athleteId: string) => ['goals', 'athlete', athleteId] as const,
  byId: (goalId: string) => ['goals', goalId] as const,
}

queryKeys.analytics = {
  all: ['analytics'] as const,
  byParams: (params: AnalyticsParams) => ['analytics', params] as const,
}
```

## Migration Plan

Single migration file adding:
1. `goals` table with constraints and RLS
2. `goal_id` column on `training_sessions` (nullable FK)
3. `result_distance_km`, `result_time_seconds`, `result_pace` columns on `training_sessions`
4. Indexes on new columns
5. Updated RLS policies on `training_sessions` for competition result editing
6. Supabase RPC function `get_analytics_summary` for server-side period aggregation

# Research: Strava Run Interval Data

**Feature**: 010-strava-run-intervals
**Date**: 2026-03-14

---

## 1. Strava API — Interval Detection

**Decision**: Use `workout_type === 3` as the primary detection signal; use lap `intensity` field for segment classification.

**Rationale**:
- `workout_type` is available on `SummaryActivity` (the list endpoint) — it's already in `raw_data` stored by `strava-sync`. No extra API call required to know a run is a workout.
- `intensity: "rest"` on laps is the only reliable programmatic signal that structured interval data exists. Without at least one rest lap, there is no interval structure worth showing.
- Alternative (pace-variance heuristic) was rejected: too unreliable across athletes and devices.

**`workout_type` enum** (Strava):
| Value | Meaning |
|-------|---------|
| `0` | Default / easy run |
| `1` | Race |
| `2` | Long run |
| `3` | Workout (structured / interval) |

---

## 2. Strava API — Lap Data

**Decision**: Fetch `GET /activities/{id}` lazily on first session card view for `workout_type === 3` sessions.

**Rationale**:
- Laps are only on `DetailedActivity`, not on the list response. One extra API call per activity is required.
- Fetching eagerly at sync time would burn rate-limit budget for all workout runs, including ones the athlete may never view in Synek.
- Lazy fetch on first view is the right tradeoff: zero extra cost at sync time, imperceptible single-call delay at view time.
- Rate limits (100 req/15 min, 1,000/day) are safe for lazy per-session fetches under normal usage.

**Lap fields used**:
| Field | Usage |
|-------|-------|
| `lap_index` | Sort order, label ("Interval 1") |
| `name` | Device-assigned label (e.g., "Warm Up", "Cool Down") — primary WU/CD signal |
| `intensity` | `"active"` / `"rest"` — interval vs recovery classification |
| `distance` | metres → km display |
| `elapsed_time` | seconds → mm:ss display |
| `moving_time` | seconds — used for pace calculation |
| `average_speed` | m/s → min/km pace |
| `average_heartrate` | bpm — optional, omitted when null |
| `max_heartrate` | bpm — optional |
| `average_cadence` | steps/min — optional |
| `pace_zone` | 1–5 — fallback when heart rate is absent |

**Fields NOT used**: `start_index`, `end_index`, `split`, `total_elevation_gain` (not relevant for interval analysis).

---

## 3. Warm-up / Cool-down Classification

**Decision**: Two-step classification — device name first, position heuristic fallback.

**Step 1 — name-based** (from device, reliable):
- Lap name contains "warm", "wu" → `warmup`
- Lap name contains "cool", "cd" → `cooldown`

**Step 2 — position heuristic** (fallback when device doesn't name laps):
- Find first rest lap index (`firstRest`) and last rest lap index (`lastRest`)
- Contiguous active laps before `firstRest` → `warmup`
- Contiguous active laps after `lastRest` → `cooldown`
- All other active laps → `interval`
- All rest laps → `recovery`

**Edge**: If no rest laps exist, no WU/CD inference is made and no interval modal is shown (feature requires at least one active/rest pair).

---

## 4. Chart Visualisation — No New Library

**Decision**: Custom CSS/Tailwind bar chart — no charting dependency added.

**Rationale**:
- The interval structure chart is conceptually simple: a row of coloured bars proportional to lap duration, labelled by segment type.
- recharts (the shadcn chart dependency) is ~70 KB gzipped — above the 50 KB threshold requiring explicit justification in the constitution. A custom implementation achieves the same result at zero bundle cost.
- A flex-div bar chart with Tailwind is fully responsive, dark-mode compatible (via CSS variables / colour tokens), and requires no external API surface to learn or maintain.
- Rejected recharts: bundle cost unjustified for a single simple chart.
- Rejected d3: far too much API surface for horizontal bars.

**Visual design**:
- Each lap = one flex bar, width proportional to `elapsed_time_seconds` relative to longest lap
- Minimum bar width enforced (rest laps are short — need to be tappable/readable)
- Colour by segment type using existing sport colour tokens where appropriate:
  - `interval` → run blue (`bg-blue-500`)
  - `recovery` → muted (`bg-muted-foreground/30`)
  - `warmup` / `cooldown` → teal (`bg-teal-500` — matches mobility token)
- Pace label below each bar
- Segment type badge above

---

## 5. `workout_type` Storage

**Decision**: Add `workout_type INTEGER` column to `strava_activities`; update `strava-sync` to write it; expose via `secure_training_sessions` view.

**Rationale**:
- `workout_type` is already present in `raw_data` JSONB (strava-sync stores the full activity). But querying `raw_data->>'workout_type'` in views is messy and unindexable.
- A dedicated column allows clean SQL expressions, indexing, and typed access in the frontend.
- `strava-sync` already upserts all scalar fields — adding one more is trivial.
- The `secure_training_sessions` view needs `sa.workout_type` exposed as `strava_workout_type` so the frontend `TrainingSession` type can carry it without an extra query.

---

## 6. New Edge Function: `strava-fetch-laps`

**Decision**: New dedicated edge function following the `strava-sync` pattern.

**Rationale**:
- The function needs a valid Strava access token for the athlete — the same token-refresh pattern used by `strava-sync` applies.
- Separating this from `strava-sync` keeps each function single-purpose and allows independent deployment/testing.
- The function checks `strava_laps` first (idempotent) — if laps exist, returns them without hitting Strava. If not, fetches from Strava, classifies segments, upserts, and returns.

**Pattern**: follows `supabase/functions/strava-auth/index.ts` exactly (CORS headers, JWT verification, `json()` helper).

---

## 7. Data Persistence Strategy

**Decision**: Dedicated `strava_laps` table (not JSONB in `strava_activities`).

**Rationale**:
- Typed columns with a row mapper (`toLap()`) align with the project convention (CLAUDE.md: no `select('*')`, snake → camel via mapper).
- Queryable without JSONB operators.
- RLS can be applied cleanly (same pattern as `strava_activities`).
- Rejected storing in `raw_data`: violates the convention that query files use typed column selects; would require JSONB parsing on every read.
- Rejected adding a `laps_data JSONB` column to `strava_activities`: same issue — typed columns are preferred.

---

## 8. Mock Strategy

**Decision**: Mock `strava_laps` data in `app/lib/mock-data/strava-laps.ts` following the existing mock pattern.

- `mockFetchSessionLaps(sessionId)` returns seeded lap arrays for known session IDs, empty array for others
- `resetMockLaps()` resets to seed state (deep clone)
- Mock simulates a 300 ms delay to match realistic fetch timing
- Test sessions in mock data include: one session with structured WU+3×interval+2×recovery+CD, one with no laps (regular run), one with auto-laps only (all active)

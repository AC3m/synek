# Research: Goal Management & Analytics Dashboard

**Feature**: 014-goals-analytics
**Date**: 2026-03-28

## R-001: Competition Session — New Type vs Flag on Existing Session

**Decision**: Add `competition` as a new `TrainingType` variant in the existing discriminated union, not a boolean flag on `TrainingSession`.

**Rationale**: The spec states "A Competition session is a first-class session type with its own distinct UI treatment." Adding it as a `TrainingType` value means:
- It flows naturally through the existing `switch(trainingType)` rendering in `SessionFormFields`
- The existing `trainingTypeConfig` system provides color/icon config out of the box
- Query filtering by type works without additional predicates
- The DB enum `training_type` already supports extension (added `walk`, `hike`, `other` in migration 013)

**Alternatives considered**:
- Boolean `is_competition` flag on `TrainingSession` — rejected because competition sessions have different aggregation rules (excluded from training volume), and a flag would require filter conditions everywhere stats are computed
- Separate `competition_sessions` table — rejected as over-engineering; competitions share 90% of fields with training sessions

## R-002: Goal Data Model — Standalone Table vs WeekPlan Extension

**Decision**: Standalone `goals` table with FK to `athlete_id`. Competition session links back to goal via `goal_id` FK on `training_sessions`.

**Rationale**: Goals span multiple weeks (preparation window) and have their own lifecycle (create → prep → compete → achieved/missed). Embedding goal data in `week_plans` would create denormalization across all prep weeks. A standalone table with a computed relationship to weeks (via date range) is cleaner.

**Alternatives considered**:
- JSONB `goals` array on `week_plans` — rejected because goals span weeks, creating update/sync complexity
- Separate `goal_weeks` join table — rejected for now; the relationship can be computed from `goal.competition_date` and `goal.preparation_weeks` without materializing it

## R-003: Preparation-Week Indicators — Materialized vs Computed

**Decision**: Computed at query time, not materialized in a join table.

**Rationale**: Given the scale (tens of goals, ~52 weeks/year), computing which weeks fall in a goal's prep window is trivial: `week_start >= (competition_date - preparation_weeks * 7) AND week_start < competition_date`. This avoids a join table that would need updating whenever a goal's date or window changes. The computation happens in the query layer (`queries/goals.ts`) and the result is cached by TanStack Query.

**Alternatives considered**:
- `goal_week_plans` join table — rejected because it duplicates information derivable from two scalar fields and adds update complexity on goal edits

## R-004: Sport Breakdown Stats — Where to Compute

**Decision**: Compute in a pure utility function `computeSportBreakdown(sessions: TrainingSession[])` in `app/lib/utils/analytics.ts`, called from `useWeekView` hook.

**Rationale**: The existing `WeekStats` is computed in `useWeekView`. Extending it with a `byType` breakdown keeps the computation collocated. A pure function is testable without React. No server-side aggregation needed for a single week's sessions (typically <20 sessions).

**Alternatives considered**:
- Server-side SQL aggregation — unnecessary for single-week view; adds latency and a new endpoint
- Denormalized `week_sport_breakdown` table — over-engineering for <20 sessions per week

## R-005: Analytics Aggregation — Client-Side vs Server-Side

**Decision**: Server-side aggregation via Supabase RPC (or a view) for period analytics; client-side for the single-week sport breakdown.

**Rationale**: Analytics spans up to a year of data (hundreds of sessions). Fetching all raw sessions to the client and aggregating in JS would be wasteful. A Supabase RPC function can aggregate distance, duration, session count, and completion rate grouped by month/week/day and optionally filtered by training type — returning a compact payload. The RPC follows the same pattern as other Supabase query functions (real + mock, row mapper).

**Alternatives considered**:
- Client-side aggregation of all sessions — rejected for year-scale data; too much data transfer
- Supabase Edge Function — unnecessary; a simple RPC/view suffices for read-only aggregation
- Materialized view — premature optimization; RPC with proper indexes is sufficient at current scale

## R-006: Analytics Charting — Library Choice

**Decision**: Use Recharts (lightweight, React-native, tree-shakeable).

**Rationale**: The analytics view needs bar charts (volume over time) and milestone markers. Recharts is ~45KB gzipped (within the 50KB constitution limit), built for React, and widely used. It supports responsive containers, tooltips, and custom shapes for milestone markers. No other charting library is currently in the project.

**Alternatives considered**:
- Chart.js + react-chartjs-2 — heavier bundle (~65KB), canvas-based (harder to style with Tailwind)
- D3 directly — too low-level for this use case; would require building chart primitives from scratch
- Nivo — larger bundle, more features than needed
- No library (CSS-only bars) — insufficient for timeline milestones and tooltips; would be reinventing

**Bundle impact**: ~45KB gzipped. Documented per Principle V. Acceptable given it's the only charting need in the app.

## R-007: Goal Achievement Logic

**Decision**: Pure function comparing result vs target, returning `'achieved' | 'missed' | 'pending'`.

**Rationale**: Per spec clarification, achievement is automatic. The logic is discipline-aware:
- Distance-based goals (run, cycling, swimming): `resultDistance >= goalDistance` → achieved
- Time-based goals: `resultTime <= goalTime` → achieved (lower is better)
- If no result entered yet: `'pending'`

This is a pure utility in `app/lib/utils/goals.ts`, easily unit-testable.

## R-008: Strava Auto-Link for Competition Sessions

**Decision**: Extend existing `strava-sync` Edge Function to check for competition sessions on the synced date.

**Rationale**: The Edge Function already maps Strava activity types to `TrainingType` and matches by week/day. Adding a check for competition sessions on the same date with matching discipline is a small extension. When ambiguous (wrong sport or multiple activities), the function returns a `needs_confirmation` status that the client handles with a prompt dialog.

**Alternatives considered**:
- Client-side matching after sync — would require fetching raw Strava activities to the client, violating the Edge Function encapsulation
- Separate Edge Function for competition sync — unnecessary duplication; the existing sync already handles the matching logic

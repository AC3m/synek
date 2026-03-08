# Implementation Plan: Google Sheets Training Data Migration

**Branch**: `001-sheets-data-migration` | **Date**: 2026-03-08 | **Spec**: [spec.md](./spec.md)

---

## Summary

Migrate 25 weeks of athlete training history from Google Sheets into Synek by:
1. Extending the DB schema with actual performance fields (`actual_duration_minutes`, `actual_distance_km`, `actual_pace`, `avg_heart_rate`, `max_heart_rate`, `rpe`) on `training_sessions`; `actual_total_km` on `week_plans`; and `coach_post_feedback` on `training_sessions`.
2. Adding a new `other` training type for unrecognisable activities.
3. Writing a one-shot TypeScript migration script (`scripts/migrate-sheets.ts`) that reads `.data/googleSheetData.csv`, validates every row with Zod, and upserts into Supabase using the service-role key.
4. Updating the UI: remove "Training Focus" from `WeekSummary`; display actual performance data and coach post-feedback on `SessionCard`; allow coaches to write post-training feedback on completed sessions.

---

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: React 19, React Router 7 (SPA), TanStack Query 5, Supabase JS 2, Zod 4, date-fns 4, papaparse (devDependency — migration script only)
**Storage**: Supabase (PostgreSQL) — `training_sessions` and `week_plans` tables extended
**Testing**: `pnpm typecheck` (tsc); mock parity check; dry-run mode in migration script
**Target Platform**: Browser SPA + Node CLI (migration script only)
**Project Type**: Web application (SPA) + one-time data migration CLI
**Performance Goals**: Migration completes in < 30 seconds for 270 CSV rows; UI interaction latency unchanged (< 16ms optimistic update)
**Constraints**: `papaparse` added as devDependency only — zero browser bundle impact; migration script uses service-role key (not shipped to app)
**Scale/Scope**: 25 weeks, ~150 sessions, 1 athlete

---

## Constitution Check

### I. Code Quality & Maintainability ✅

- New session fields added via `toSession()` row mapper in `app/lib/queries/sessions.ts` — no inline DB access.
- `OtherData` added as a proper discriminated union member with `type: 'other'`.
- All new input types follow existing `UpdateSessionInput` / `CreateSessionInput` pattern.
- `coach_post_feedback` update goes through existing `updateSession()` query function, extended with the new field.
- Migration script uses the Supabase SDK (same pattern as app queries) — not raw SQL strings.

### II. Testing Standards ✅

- All new `TrainingSession` fields default to `null` in mock data (`app/lib/mock-data.ts`) — mock parity maintained.
- `mockUpdateSession` extended to handle new fields.
- `WeekPlan` mock updated with `actualTotalKm: null`.
- Migration script includes `--dry-run` mode that validates all rows without writing — acts as an integration test of the parse/validate pipeline.
- `pnpm typecheck` is the final gate before merge.

### III. User Experience Consistency ✅

- `other` training type added to `training-types.ts` with `text-slate-600 / bg-slate-100` colour and `Activity` Lucide icon — within the existing colour system (slate is a neutral that doesn't conflict with sport-specific tokens).
- All new user-visible strings added to both `en/` and `pl/` translation files simultaneously.
- `t('training:actualPerformance.*')` and `t('training:coachPostFeedback.*')` keys added in both languages.
- "Training Focus" i18n keys (`weekSummary.description`, `weekSummary.descriptionPlaceholder`) removed from both language files.

### IV. Performance Requirements ✅

- New columns are nullable — no existing queries change their result shape or require migration of existing rows.
- `SessionCard` actual-performance section only renders when at least one field is non-null — zero cost for sessions without data.
- `papaparse` is a devDependency; it does not enter the production bundle.
- No new `select('*')` queries — existing selectors already fetch `*`; the new columns will be included automatically. (Acceptable for now; noted for future column-specific query refinement.)

### V. Simplicity & Anti-Complexity ✅

- No new React Query hooks — `updateSession` and `updateWeekPlan` mutations extended in-place.
- Migration script is a single file — no abstraction layers, no configuration system.
- `coach_post_feedback` write uses the existing `updateSession` path, not a new mutation.
- `WeekSummary` field removal is a straight deletion of JSX + state + i18n keys — no adapter needed.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-sheets-data-migration/
├── plan.md              ← this file
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── quickstart.md        ← Phase 1
├── contracts/
│   ├── session-card.md
│   ├── week-summary.md
│   └── migration-script.md
└── tasks.md             ← Phase 2 (created by /speckit.tasks)
```

### Source Code Changes

```text
supabase/migrations/
└── 009_sheets_schema_extension.sql    ← NEW: extends training_sessions + week_plans

scripts/
└── migrate-sheets.ts                  ← NEW: one-shot CSV→Supabase migration

app/types/
└── training.ts                        ← EDIT: add 'other', OtherData, new fields

app/lib/utils/
└── training-types.ts                  ← EDIT: add 'other' config

app/lib/queries/
├── sessions.ts                        ← EDIT: toSession() mapper + updateSession() fields
└── weeks.ts                           ← EDIT: toWeekPlan() mapper + updateWeekPlan() field

app/lib/mock-data.ts                   ← EDIT: null-default new fields on all mock objects

app/components/calendar/
├── SessionCard.tsx                    ← EDIT: actual perf section + coachPostFeedback
└── WeekSummary.tsx                    ← EDIT: remove Training Focus, add actualTotalKm

app/i18n/resources/en/
├── common.json                        ← EDIT: add 'other' training type
├── training.json                      ← EDIT: actual performance + coachPostFeedback keys
└── coach.json                         ← EDIT: remove description/descriptionPlaceholder

app/i18n/resources/pl/
├── common.json                        ← EDIT: add 'other' (Inne)
├── training.json                      ← EDIT: Polish translations
└── coach.json                         ← EDIT: remove description keys
```

**Structure Decision**: Single-project structure (existing repo). Migration script goes in a new `scripts/` directory at repo root — consistent with convention for ad-hoc Node scripts in Vite/React projects.

---

## Complexity Tracking

No constitution violations requiring justification.

| Decision | Why |
|---|---|
| `papaparse` as devDependency | CSV contains quoted multiline fields that manual parsing cannot handle reliably; zero production bundle impact |
| Service-role key for migration | RLS would block batch insert across athlete ownership boundaries; key is never committed or shipped |
| `scripts/` at repo root | Migration is a one-time developer tool, not app code; belongs outside `app/` |

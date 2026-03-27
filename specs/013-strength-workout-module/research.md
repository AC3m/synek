# Research: Strength Workout Module

## Resolved Questions

### 1. Variant ownership model — who owns variants?

**Decision**: Variants are owned by `user_id` (the creator — either coach or athlete with `can_self_plan`). They are personal to the creator, not shared across coach–athlete pairs.

**Rationale**: The simplest model that matches the existing auth pattern. A coach creates their own variants for use when planning any athlete's sessions. An athlete with `can_self_plan` creates their own. No sharing/permission complexity required at this stage.

**Alternatives considered**: A shared pool per coach–athlete team. Rejected: adds a join table and permission model not needed for MVP. Can be revisited.

---

### 2. Pre-fill query strategy — how to get last session per exercise?

**Decision**: Use a Supabase `DISTINCT ON (variant_exercise_id)` query joining `strength_session_exercises → training_sessions → week_plans` filtered by `athlete_id` and `variant_exercise_id IN (...)`. Ordered by `completed_at DESC`.

**Rationale**: Single round-trip query; returns one row per exercise with the most recent data. Can be done in a Supabase RPC or via a filtered select with `.order()` + `.limit(1)` per exercise (N+1 avoided via IN clause with DISTINCT ON).

**Alternatives considered**:
- Client-side aggregation from full history fetch — rejected (too much data transfer)
- Supabase RPC for pre-fill — viable but adds complexity; direct query with DISTINCT ON is sufficient

---

### 3. Chart library for progress analysis

**Decision**: Add `recharts` via shadcn's `chart` component (`pnpm dlx shadcn@latest add chart`). This adds ~50 KB gzipped to the production bundle — at the constitutional limit but justified.

**Rationale**: shadcn's Chart component uses recharts, which is the de-facto standard paired with shadcn/ui. It is tree-shakeable, provides accessible charts out of the box, and avoids a custom SVG chart implementation. The bundle impact is exactly at the 50 KB gzipped threshold defined in Principle IV.

**Alternatives considered**:
- Custom SVG/div chart (like `IntervalChart.tsx`) — rejected because a multi-line time-series chart with tooltips, legend, and date formatting is too complex to implement correctly from scratch
- Victory / nivo — larger bundles and different API style incompatible with shadcn aesthetics
- No chart (table only) — reduces value of the analysis view significantly

**Bundle justification**: recharts ~50 KB gzipped. The chart component is lazy-loaded only when the Progress tab is active, so the impact on initial TTI is negligible. This must be documented in plan.md per Principle IV.

---

### 4. `strength_session_exercises` FK on `variant_exercise_id` — `ON DELETE` behavior

**Decision**: `ON DELETE SET NULL` on `variant_exercise_id` FK. Historical session data is preserved even if the source exercise is removed from a variant.

**Rationale**: Audit-sensitive data. An athlete's completed reps and loads are their training history — deleting a variant exercise should not erase that history. Matches the constitution's preference for `SET NULL` over `CASCADE` on audit-sensitive FKs.

**Alternatives considered**: `ON DELETE CASCADE` — rejected because it would silently delete performance history when a coach edits a variant.

---

### 5. Integration point with existing `StrengthData` JSONB

**Decision**: Add `variantId?: string` to the `StrengthData` interface and to the `type_specific_data` JSONB stored in `training_sessions`. No migration needed — JSONB is additive.

**Rationale**: Least-invasive integration. Existing sessions without variants continue to work. The variant link is stored alongside the session's other strength data. The `strength_session_exercises` table provides the detailed per-exercise log separately from the JSONB.

**Alternatives considered**: A dedicated `variant_id` column on `training_sessions` — rejected because it requires a schema migration and complicates the existing session mapper. JSONB extension is simpler for an optional reference.

---

### 6. Progression intent — where is it stored and how used?

**Decision**: Stored in `strength_session_exercises.progression` (enum: `up | maintain | down`) for each exercise in the completed session. When pre-filling the next session, the system reads the last session's `progression` field and renders a directional indicator in the form (not a hard target override — just a hint).

**Rationale**: Storing intent at the exercise level allows fine-grained control (one exercise progressing, another maintaining). The hint-based approach respects that the athlete/coach may override the intent.

**Alternatives considered**: Storing a `target_load_kg` automatically calculated from prior load + progression — rejected as too prescriptive without knowing the increment step (athlete-specific).

---

### 7. Routes — shared or role-split?

**Decision**: Add `/coach/strength` and `/coach/strength/:variantId` routes under the existing coach layout. Athletes access their own variants via an `/athlete/strength` route added to the athlete layout. Both routes share the same components with role-based read/write controls.

**Rationale**: Follows the existing pattern of coach/ and athlete/ route separation. Avoids a complex shared route with role detection. The shared component library handles the conditional edit/view behavior.

**Alternatives considered**: A single shared `/strength` route — rejected because it requires crossing the existing coach/athlete layout boundary, which conflicts with the layout structure in `routes.ts`.

---

### 8. No new shadcn components needed beyond chart

All UI elements (cards, forms, tabs, dialogs, buttons, inputs) already exist in the shadcn component library installed in the project. The only new shadcn component required is `chart` (for the progress view, P4). New components to scaffold: `VariantCard`, `VariantForm`, `VariantExerciseList`, `ExerciseProgressChart`, `SessionExerciseLogger` — all in `app/components/strength/`.

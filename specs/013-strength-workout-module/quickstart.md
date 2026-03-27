# Quickstart: Strength Workout Module

## Prerequisites

- Feature branch `013-strength-workout-module` checked out
- `pnpm install` run (no new dependencies until Phase D — chart)
- Supabase local running (`supabase start`) or mock mode active (default when env vars are placeholders)

## Development Sequence

Work in phase order. Each phase is independently testable in mock mode.

### Phase A — Database (do first)

```bash
# Apply the new migration (adds 3 tables + RLS + RPC)
supabase migration new 022_strength_variants
# Populate the file at supabase/migrations/022_strength_variants.sql (see data-model.md)
supabase db push   # or: supabase migration up
```

Tables created: `strength_variants`, `strength_variant_exercises`, `strength_session_exercises`.
RPC created: `get_last_session_exercises`.

### Phase B — Types & Query Layer

1. Extend `app/types/training.ts` — add `StrengthVariant`, `StrengthVariantExercise`, `StrengthSessionExercise`, `ProgressionIntent`, and all Input types.
2. Add `variantId?: string` to `StrengthData` interface.
3. Create `app/lib/queries/strength-variants.ts` — real + mock implementations for all CRUD and pre-fill queries.
4. Create `app/lib/mock-data/strength-variants.ts` — seed data + `resetMockStrengthVariants()`.
5. Create `app/lib/hooks/useStrengthVariants.ts` — all hooks with full optimistic-update cycle.
6. Add query keys to `app/lib/queries/keys.ts`.

```bash
pnpm typecheck   # should pass after types + query layer
```

### Phase C — i18n Keys

Add all new keys to **both** `app/i18n/resources/en/training.json` and `app/i18n/resources/pl/training.json`.

Key namespaces to add under `strength`:
- `strength.variant.*` — variant form and library labels
- `strength.exercise.*` — exercise field labels (extends existing)
- `strength.progression.*` — up/maintain/down labels
- `strength.analysis.*` — chart and progress view labels
- `strength.empty.*` — empty state messages

### Phase D — Core Components (no new dependencies)

Create `app/components/strength/`:
1. `VariantCard.tsx`
2. `VariantForm.tsx` (exercise list with up/down reorder buttons — no DnD library)
3. `VariantExerciseList.tsx`
4. `SessionExerciseLogger.tsx`

Modify existing:
5. `app/components/training/type-fields/StrengthFields.tsx` — add variant selector + conditional pre-fill
6. `app/components/training/SessionDetailModal.tsx` — add `<SessionExerciseLogger>` in Actual section for variant-linked strength sessions

### Phase E — Routes

1. Add coach strength routes in `app/routes.ts`:
   - `coach/strength` → `routes/coach/strength.tsx`
   - `coach/strength/:variantId` → `routes/coach/strength.$variantId.tsx`
2. Add athlete strength routes:
   - `athlete/strength` → `routes/athlete/strength.tsx`
   - `athlete/strength/:variantId` → `routes/athlete/strength.$variantId.tsx`

```bash
pnpm typecheck   # generates route types
```

### Phase F — Analysis Chart (new dependency — add last)

```bash
pnpm dlx shadcn@latest add chart   # adds recharts + shadcn chart wrapper
```

Create `app/components/strength/ExerciseProgressChart.tsx`.
Add Progress tab to `routes/coach/strength.$variantId.tsx` and `routes/athlete/strength.$variantId.tsx`.

### Phase G — Polish & Verification

```bash
pnpm typecheck   # must pass with 0 errors
```

Manual checklist:
- [ ] Create a variant with 3 exercises (mock mode)
- [ ] Create a strength session linked to the variant
- [ ] Log actual reps/load/progression in SessionDetailModal
- [ ] Create a second session — verify pre-fill shows prior session data
- [ ] Open variant Progress tab — verify chart renders
- [ ] Switch language (EN/PL) — verify all strength strings translate
- [ ] Verify no hardcoded English strings in JSX

## Mock Mode Testing

The app runs in mock mode automatically when Supabase env vars are missing. Mock data is seeded in `app/lib/mock-data/strength-variants.ts`. Import `resetMockStrengthVariants()` in test `beforeEach`.

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/types/training.ts` | Domain types — `StrengthVariant`, `StrengthSessionExercise`, etc. |
| `app/lib/queries/strength-variants.ts` | All Supabase + mock query functions |
| `app/lib/mock-data/strength-variants.ts` | Mock seed data |
| `app/lib/hooks/useStrengthVariants.ts` | React Query hooks |
| `app/lib/queries/keys.ts` | `strengthVariantKeys` factory |
| `app/components/strength/` | All new UI components |
| `supabase/migrations/022_strength_variants.sql` | DB schema |
| `app/i18n/resources/en/training.json` | EN strings |
| `app/i18n/resources/pl/training.json` | PL strings |
| `app/routes/coach/strength.tsx` | Coach variant library page |
| `app/routes/coach/strength.$variantId.tsx` | Coach variant detail + progress |
| `app/routes/athlete/strength.tsx` | Athlete variant library page |
| `app/routes/athlete/strength.$variantId.tsx` | Athlete variant detail |

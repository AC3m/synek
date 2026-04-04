# Quickstart: Strength Session UX Redesign

**Feature**: `015-strength-session-ux`

---

## Prerequisites

```bash
# Ensure you're on the feature branch
git checkout 015-strength-session-ux

# Install dependencies (should already be up to date)
pnpm install
```

---

## Run in development (mock mode)

```bash
# Ensure .env.local has placeholder Supabase credentials
# (mock mode activates automatically when credentials are absent/placeholder)
pnpm dev
# Open http://localhost:5173
```

Navigate to a strength session as an athlete. The mock data in
`app/lib/mock-data/strength-variants.ts` provides seed variants with a prior
completed session, so you can exercise all new UX behaviours without a live DB.

---

## Apply the DB migration (Supabase connected)

```bash
# Apply locally (Supabase CLI)
supabase db push

# Or run the migration file directly on your local Supabase:
supabase migration up
```

The migration adds `progression_increment NUMERIC(6,2) NULL` to
`strength_variant_exercises`. Existing rows default to NULL (no increment
configured) — no data migration needed.

---

## Type check

```bash
pnpm typecheck
# Must exit 0 before any PR is opened
```

---

## Run tests

```bash
pnpm test:run
# Or in watch mode:
pnpm test
```

Key test files for this feature:
- `app/test/unit/computePrefillSets.test.ts` — pure function, all branches
- `app/test/integration/SessionExerciseLogger.test.tsx` — extended with new scenarios
- `app/test/integration/IncrementField.test.tsx` — variant config increment field

---

## Key files changed by this feature

| File | Change |
|------|--------|
| `supabase/migrations/TIMESTAMP_add_progression_increment.sql` | New migration |
| `app/types/training.ts` | `progressionIncrement` on `StrengthVariantExercise` |
| `app/lib/queries/strength-variants.ts` | Row mapper + upsert update |
| `app/lib/mock-data/strength-variants.ts` | Seed data + mock upsert update |
| `app/lib/utils/strength.ts` | `computePrefillSets` utility |
| `app/components/strength/PrevSetRow.tsx` | New component |
| `app/components/strength/CopySetButton.tsx` | New component |
| `app/components/strength/PrefillBadge.tsx` | New component |
| `app/components/strength/IncrementField.tsx` | New component |
| `app/components/strength/SessionExerciseLogger.tsx` | Refactored `ExerciseCard` |
| `app/components/strength/VariantExerciseList.tsx` | Add increment field |
| `app/i18n/resources/en/training.json` | New keys |
| `app/i18n/resources/pl/training.json` | New keys (simultaneously) |

---

## New i18n keys to add (both en/ and pl/ simultaneously)

```
strength.logger.prev                 # "prev"
strength.logger.prevTopSet           # "(top set)"
strength.logger.prevNone             # "—"
strength.logger.copyFromAbove        # "Copy from set above"
strength.logger.prefillFrom          # "From {{date}}"
strength.logger.prefillUp            # "▲ +{{increment}} from {{date}}"
strength.logger.prefillDown          # "▼ −{{increment}} from {{date}}"
strength.logger.prefillMaintain      # "= from {{date}}"
strength.logger.firstSession         # "First session — establish your baseline"
strength.logger.setIncrementHint     # "Set an increment in variant config to auto-progress"
strength.logger.floorReached         # "Floor reached — adjust increment"
strength.exercise.incrementLabel     # "Load increment per session"
strength.exercise.durationIncrement  # "Duration increment per session"
strength.exercise.incrementChip      # "+{{value}} {{unit}}"
strength.exercise.advancedToggle     # "Advanced"
```

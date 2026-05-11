# Issue #74 — Wojtek's Session Feedback (Design Spec)

**Date:** 2026-04-25
**Source issue:** [#74 — User feedback: Wojtek's session (Apr 2026)](https://github.com/AC3m/synek/issues/74)
**Deferred companion issue:** [#87 — Deferred: Advanced training logging features](https://github.com/AC3m/synek/issues/87)

## Scope

Five user stories from issue #74 are in scope for this design. Four others are deferred to issue #87.

| ID    | Title                                          | Effort     |
| ----- | ---------------------------------------------- | ---------- |
| US-3  | Mobile Safari template picker — safe area fix  | Low        |
| US-1  | Variant → session mental model guidance        | Low–Medium |
| US-4  | Inline set add/remove + user preference toggle | Medium     |
| US-2  | Terminology popovers                           | Low        |
| US-10 | Training type search aliases                   | Low        |

Out of scope (tracked in #87): US-5 (unilateral tracking), US-6 (per-hand load), US-7 (RIR per set), US-8 (exercise-specific strength goals), US-9 (auto-calculated prep weeks — depends on US-8).

---

## US-3 — Mobile Safari template picker safe area fix

### Problem

`VariantPicker` renders a bottom `Sheet` on mobile. Safari's bottom toolbar (back/forward/share controls) overlaps the Sheet content, hiding the lower portion of the variant list and the Search input on shorter viewports.

### Solution

Add safe-area bottom inset padding to the `SheetContent` element.

```tsx
// app/components/strength/VariantPicker.tsx
<SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
```

This mirrors the pattern from PR #85 (header notch fix). No other changes.

### Acceptance

- On iOS Safari, the variant list is fully scrollable above the browser's bottom toolbar
- No regression on desktop, Chrome, Android

---

## US-1 — Variant → session mental model

### Problem

Athletes create variants in the strength library but don't realise the variant must be attached to a Strength session on the week view to log a workout. The library feels like a dead-end.

### Solution

Three layered hints, each catching a different point of confusion:

#### Layer 1 — Persistent library subtitle

`StrengthLibraryView` gains a static description below the title:

> "Templates define your exercises, sets and rep targets. To log a workout, add a Strength session to your week plan and select a template there."

Always visible. Helps first-time visitors orient themselves.

#### Layer 2 — Post-save callout in variant form

After saving a variant in `VariantForm`/`VariantFormModal`, show an inline callout:

> ✓ Template saved. To log a workout with this template, add a **Strength** session to your week plan. **[Go to this week →]**

- Dismissible via × button
- Component-state only (no persistence) — fires on every save
- Link navigates to the athlete's current week (`/athlete/week/<currentWeekId>`)

#### Layer 3 — Strength session card hint

When a strength session has no `typeSpecificData.variantId`, the session card on the week view shows a dashed-border CTA:

> ⚠ No template selected — pick one to track your sets

- Tap opens the existing `VariantPicker`
- Lives in `SessionCard` (or wherever strength sessions render on the week grid)
- Hidden when `variantId` is set

### Acceptance

- All three hints render and link correctly
- All hint copy added to `en/training.json` and `pl/training.json`
- Layer 2 dismiss state resets when the form is reopened (acceptable — fires once per save)

---

## US-4 — Inline set add/remove + user preference

### Problem

Mid-workout, athletes sometimes need to add or remove a set (e.g. did 4 sets when 3 were planned, or had to drop the last set). Currently they must leave the session view and edit the variant template — which mutates the template for future sessions too.

### Solution

#### UI — `ExerciseCard` set list footer

When `!readOnly` AND `allowSetAdjustment === true`, render two buttons below the set list:

- **− Remove set** — pops the last entry from the local `sets[]` state. Disabled when only one set remains.
- **+ Add set** — appends a fresh empty entry `{ reps: '', load: '', isPreFilled: false }`.

State-only change. Existing `commit()` flow fires on the next blur — no schema change to `SetEntry`.

```tsx
// pseudocode
{
  !readOnly && allowSetAdjustment && (
    <div className="mt-2 flex gap-2">
      <Button variant="outline" size="sm" disabled={sets.length <= 1} onClick={removeLastSet}>
        − {t('strength.logger.removeSet')}
      </Button>
      <Button variant="outline" size="sm" onClick={addSet}>
        + {t('strength.logger.addSet')}
      </Button>
    </div>
  );
}
```

#### Settings — new "Training" tab (athlete only)

Add a new tab to `app/routes/settings.tsx`:

```tsx
{
  user?.role === 'athlete' && (
    <TabsTrigger value="training">{t('settings.tabs.training')}</TabsTrigger>
  );
}
```

`TabsContent value="training"` renders a new `TrainingTab` component:

- Section header: "Strength training"
- Single toggle row: **Adjust sets mid-session** (sublabel: "Add or remove sets while logging a workout")
- Bound to `training_preferences.allowSetAdjustment`
- Default: ON

#### Data model

New migration `2026XXXXXXXXXX_add_training_preferences_to_profiles.sql`:

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_preferences JSONB
  NOT NULL DEFAULT '{"allowSetAdjustment": true}'::jsonb;
```

The existing `own_profile_update` RLS policy already covers writes to this column. No new policy needed.

#### Types

```ts
// app/types/preferences.ts (new file)
export interface TrainingPreferences {
  allowSetAdjustment: boolean;
}

export const DEFAULT_TRAINING_PREFERENCES: TrainingPreferences = {
  allowSetAdjustment: true,
};
```

#### Query layer

Extend `app/lib/queries/profile.ts` to include `training_preferences` in the profile select. Add a mutation `updateTrainingPreferences(input: Partial<TrainingPreferences>)` that performs a JSONB merge update on `profiles.training_preferences`.

#### Hook

```ts
// app/lib/hooks/useTrainingPreferences.ts (new file)
export function useTrainingPreferences() {
  const profile = useProfile();
  const mutation = useUpdateTrainingPreferences();

  return {
    preferences: profile.data?.trainingPreferences ?? DEFAULT_TRAINING_PREFERENCES,
    update: mutation.mutate,
    isLoading: profile.isLoading,
  };
}
```

#### Wiring

`SessionExerciseLogger` reads `allowSetAdjustment` from the hook and passes it as a prop to each `ExerciseCard`.

### Acceptance

- Migration runs cleanly; existing rows get the default value via the column default
- Toggle in Settings → Training round-trips through Supabase
- ExerciseCard shows/hides +/− buttons based on the preference
- Buttons hidden when `readOnly` (e.g. completed sessions, coach view)
- "Remove set" disabled at `sets.length === 1` to prevent zero-set state
- i18n keys added to both locales

---

## US-2 — Terminology popovers

### Problem

Athletes encounter unexplained terminology in the strength logger and have no in-app way to learn what the terms mean. Two specific areas:

1. The sets/reps target line in `ExerciseCard` header (e.g. "3 sets · Target: 8–10 reps")
2. The "Next session" `ProgressionToggle` (↑ / = / ↓ icons)

### Solution

Add small `ⓘ` icons next to the labels in both locations. Use shadcn `Popover`. Tap opens a 1–2 sentence explanation.

#### Implementation

- Reusable component: `app/components/ui/InfoPopover.tsx` accepting `content: ReactNode` (or a translation key)
- Icon: lucide `Info` at `size-3.5`, muted-foreground colour
- Touch target: minimum 44×44px hit area (wrap in a button with padding)
- Closes on outside click / Escape key (shadcn Popover defaults)

#### Copy (English)

- **Sets/reps target:** "The coach set a rep target range. Fill in your actual reps per set — don't aim to hit the exact number, just log what you did."
- **Next session:** "Tell your coach whether to increase the load next time (↑), keep it the same (=), or reduce it (↓). This guides the next session's template."

Polish translations added in parallel.

### Acceptance

- Icons render at both locations in `ExerciseCard`
- Popover opens on tap, closes on outside click
- Copy in `en/training.json` and `pl/training.json`
- 44×44px touch target on mobile

---

## US-10 — Training type search aliases

### Problem

The session type picker in `SessionFormFields.tsx` shows training types as badges (Strength, Run, Cycling, …). An athlete looking for "gym" finds nothing because the label is "Strength". No search input exists today on this picker.

### Solution

Two-part change:

#### 1. Aliases map in `app/lib/utils/training-types.ts`

```ts
export const TRAINING_TYPE_ALIASES: Record<TrainingType, string[]> = {
  strength: ['gym', 'weights', 'lifting', 'siłownia', 'silownia'],
  run: ['running', 'jog', 'bieganie'],
  cycling: ['bike', 'ride', 'rower', 'kolarstwo'],
  swimming: ['swim', 'pływanie', 'plywanie'],
  walk: ['walking', 'spacer'],
  hike: ['hiking', 'wędrówka', 'wedrowka'],
  yoga: ['joga'],
  mobility: ['mobilność', 'mobilnosc', 'stretching'],
  pilates: [],
  elliptical: ['orbiter', 'orbitrek'],
  rest_day: ['rest', 'recovery', 'odpoczynek'],
  other: [],
};

export function matchesTrainingType(query: string, type: TrainingType, label: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (label.toLowerCase().includes(q)) return true;
  return TRAINING_TYPE_ALIASES[type].some((alias) => alias.includes(q));
}
```

#### 2. Search input on session type picker

In `SessionFormFields.tsx`, above the `TRAINING_TYPES.map(...)` badge list:

- Add an `Input` with placeholder `t('coach:session.searchTypePlaceholder')` (e.g. "Search training types…")
- Filter `TRAINING_TYPES` using `matchesTrainingType(search, tt, t('common:trainingTypes.' + tt))`
- Empty result shows a muted "No matching training type" line
- Always visible (above the badge list) for consistency across short and long type lists

### Acceptance

- Typing "gym" filters the badge list to show only "Strength"
- Typing "rower" (Polish for cycling) shows "Cycling" when locale is `en`
- Empty search shows all types
- Aliases checked alongside label, both case-insensitive
- Diacritics-insensitive for Polish (achieved by including stripped-diacritics aliases like "silownia" alongside "siłownia")

---

## File-Level Change Summary

### New files

- `app/types/preferences.ts` — `TrainingPreferences` type + default
- `app/lib/hooks/useTrainingPreferences.ts` — hook for reading/updating preferences
- `app/components/settings/TrainingTab.tsx` — settings tab content
- `app/components/ui/InfoPopover.tsx` — reusable popover with info icon
- `supabase/migrations/2026XXXXXXXXXX_add_training_preferences_to_profiles.sql` — migration
- `docs/superpowers/specs/2026-04-25-issue-74-wojtek-feedback-design.md` — this file

### Modified files

- `app/components/strength/VariantPicker.tsx` — safe area padding (US-3)
- `app/components/strength/SessionExerciseLogger.tsx` — pass `allowSetAdjustment` prop, render set add/remove buttons, info icons in ExerciseCard (US-2, US-4)
- `app/components/strength/StrengthLibraryView.tsx` — persistent subtitle (US-1 layer 1)
- `app/components/strength/VariantForm.tsx` (or `VariantFormModal.tsx`) — post-save callout (US-1 layer 2)
- `app/components/calendar/SessionCard.tsx` — empty-variant CTA on strength sessions (US-1 layer 3)
- `app/components/training/SessionFormFields.tsx` — search input + alias filter (US-10)
- `app/lib/utils/training-types.ts` — `TRAINING_TYPE_ALIASES` + `matchesTrainingType` (US-10)
- `app/lib/queries/profile.ts` — include `training_preferences` in select; add `updateTrainingPreferences` mutation
- `app/lib/hooks/useProfile.ts` — extend to expose `trainingPreferences` (or add new `useTrainingPreferences` hook that wraps it)
- `app/routes/settings.tsx` — register Training tab
- `app/i18n/resources/en/training.json` — new keys
- `app/i18n/resources/en/common.json` — new keys (`settings.tabs.training`, search placeholder)
- `app/i18n/resources/pl/training.json` — new keys
- `app/i18n/resources/pl/common.json` — new keys

---

## Recommended Implementation Order

1. **US-3** — single-line safe-area fix; ship first as a tiny PR
2. **US-10** — frontend-only aliases + search input
3. **US-2** — info popovers + reusable component
4. **US-1** — three-layer guidance (group as one PR)
5. **US-4** — migration + settings tab + UI; largest scope, ships last

Each story is independent and can ship in its own PR.

---

## Out of Scope (this batch)

- Layer 2 of US-1 fires the callout on every save. If feedback shows it becomes annoying, persist a `seenVariantNudge` flag on profiles in a future iteration. Not implemented now (YAGNI).
- US-9 (auto-calculated prep weeks) is dropped and will land with US-8 in #87.

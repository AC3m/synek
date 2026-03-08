# Contract: WeekSummary Component

**File**: `app/components/calendar/WeekSummary.tsx`
**Change type**: Removal (Training Focus field) + Extension (Actual KM display)

---

## Props Interface Changes

```typescript
// onUpdate callback — extend accepted fields
onUpdate?: (updates: Partial<Pick<WeekPlan,
  'loadType' | 'totalPlannedKm' | 'coachComments' | 'actualTotalKm'  // actualTotalKm added
  // 'description' REMOVED — Training Focus field no longer surfaced in UI
>>) => void;
```

---

## Rendering Changes

### Removed: Training Focus field

The `description` textarea (labelled "Training Focus") is **removed** from the rendered output. The `weekPlan.description` DB field is retained but no longer shown in `WeekSummary`.

### Added: Actual KM field

**Condition**: Always visible when `actualTotalKm` is non-null; or as an editable input in coach mode.

**Display**: Below "Planned KM", labelled `t('coach:weekSummary.actualKm')`.

**Behaviour**: Coach-editable input (same pattern as `plannedKm`). In `readonly` mode, displayed as static text. If null and readonly, the field is hidden.

---

## Unchanged Contracts

- Week Load (loadType) selector: unchanged.
- Planned KM field: unchanged.
- Coach Notes textarea: unchanged.
- Stats section and progress bar: unchanged.

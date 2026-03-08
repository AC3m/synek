# Contract: SessionCard Component

**File**: `app/components/calendar/SessionCard.tsx`
**Change type**: Extension (new prop behaviours, new rendered sections)

---

## Props Interface Changes

### New prop

```typescript
/** Coach role only — callback to save post-training feedback */
onUpdateCoachPostFeedback?: (sessionId: string, feedback: string | null) => void;
```

No other props change.

---

## Rendering Contracts

### Actual Performance Section

**Condition**: `session.isCompleted === true` AND at least one of `actualDurationMinutes`, `actualDistanceKm`, `actualPace`, `avgHeartRate`, `maxHeartRate`, `rpe` is non-null.

**Location**: Below the planned duration/distance row.

**Displayed fields** (only non-null values shown):
| Field | Display label (i18n key) | Format |
|---|---|---|
| `actualDurationMinutes` | `training:actualPerformance.duration` | `X min` |
| `actualDistanceKm` | `training:actualPerformance.distance` | `X.X km` |
| `actualPace` | `training:actualPerformance.pace` | raw string, e.g. `4:47 /km` |
| `avgHeartRate` | `training:actualPerformance.avgHr` | `X bpm` |
| `maxHeartRate` | `training:actualPerformance.maxHr` | `X bpm` |
| `rpe` | `training:actualPerformance.rpe` | `X/10` |

### Coach Post-Training Feedback Section

**Condition**: `session.isCompleted === true`

**Athlete view**: Read-only text. If `coachPostFeedback` is null → show `t('training:coachPostFeedback.empty')` in muted style.

**Coach view** (`athleteMode === false`): Editable `Textarea`. Saves on blur via `onUpdateCoachPostFeedback`. If null → show placeholder `t('training:coachPostFeedback.placeholder')`.

---

## Unchanged Contracts

- All existing props remain with same signatures.
- Athlete completion toggle and athlete notes remain unchanged.
- Edit/delete buttons for coach remain unchanged.

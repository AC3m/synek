# RPC Contracts: Multi-Week Planning

## `copy_week_sessions`

**Purpose**: Copy all planned sessions from one week plan to another. Used for full-week copy.

**Caller**: `app/lib/queries/sessions.ts` → `copyWeekSessions(input: CopyWeekInput)`

**Signature**:
```sql
copy_week_sessions(
  p_source_week_plan_id UUID,
  p_target_week_plan_id UUID
) RETURNS integer
```

**Returns**: Number of sessions copied (used for toast confirmation message).

**Behaviour**:
- Copies planned fields only: `day_of_week`, `sort_order`, `training_type`, `description`, `coach_comments`, `planned_duration_minutes`, `planned_distance_km`, `type_specific_data`
- Does NOT copy: `is_completed`, any `actual_*` field, `strava_*` fields, `trainee_notes`, `coach_post_feedback`
- Appends to target week (does not clear existing sessions first)
- Atomic — all sessions copy or none copy

**Frontend call**:
```typescript
const { data: count } = await supabase.rpc('copy_week_sessions', {
  p_source_week_plan_id: sourceWeekPlanId,
  p_target_week_plan_id: targetWeekPlanId,
})
```

**Error cases**:
- Source or target `week_plan_id` does not exist → Postgres FK violation → throw to caller
- Source week has no sessions → copies 0 sessions, returns 0 (not an error)

---

## `copy_day_sessions`

**Purpose**: Copy all planned sessions from one day in a source week to a specific day in the target week. Used for day-level copy.

**Caller**: `app/lib/queries/sessions.ts` → `copyDaySessions(input: CopyDayInput)`

**Signature**:
```sql
copy_day_sessions(
  p_source_week_plan_id UUID,
  p_source_day         text,   -- e.g. 'monday'
  p_target_week_plan_id UUID,
  p_target_day         text    -- e.g. 'thursday'
) RETURNS integer
```

**Returns**: Number of sessions copied.

**Behaviour**:
- Same planned-fields-only rule as `copy_week_sessions`
- Target day's existing sessions are preserved — copies are appended with `sort_order` offset
- `sort_order` of copies = `MAX(existing sort_order in target day) + 10 + source sort_order`

**Frontend call**:
```typescript
const { data: count } = await supabase.rpc('copy_day_sessions', {
  p_source_week_plan_id: sourceWeekPlanId,
  p_source_day: sourceDay,
  p_target_week_plan_id: targetWeekPlanId,
  p_target_day: targetDay,
})
```

**Error cases**:
- Source day has no sessions → returns 0 (not an error)
- Invalid `day_of_week` text value → checked by application layer before calling

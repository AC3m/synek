-- Migration 021: Add RPC functions for atomic session copy operations
-- These functions are ADDITIVE ONLY — no existing tables, columns, or data are modified.

-- ---------------------------------------------------------------------------
-- copy_week_sessions
-- Copies all planned sessions from a source week plan to a target week plan.
-- Only copies planned fields; actual/Strava/athlete fields are NOT copied.
-- Returns the number of sessions copied.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copy_week_sessions(
  p_source_week_plan_id UUID,
  p_target_week_plan_id UUID
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO training_sessions (
    week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  )
  SELECT
    p_target_week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  FROM training_sessions
  WHERE week_plan_id = p_source_week_plan_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- copy_day_sessions
-- Copies all planned sessions from one day in a source week to a specific day
-- in a target week. Appends after existing sessions in the target day.
-- Returns the number of sessions copied.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION copy_day_sessions(
  p_source_week_plan_id UUID,
  p_source_day         text,
  p_target_week_plan_id UUID,
  p_target_day         text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_sort integer;
  v_count    integer;
BEGIN
  -- Find the current max sort_order in the target day to append after existing sessions
  SELECT COALESCE(MAX(sort_order), 0)
    INTO v_max_sort
    FROM training_sessions
   WHERE week_plan_id = p_target_week_plan_id
     AND day_of_week  = p_target_day::day_of_week;

  INSERT INTO training_sessions (
    week_plan_id,
    day_of_week,
    sort_order,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  )
  SELECT
    p_target_week_plan_id,
    p_target_day::day_of_week,
    sort_order + v_max_sort + 10,
    training_type,
    description,
    coach_comments,
    planned_duration_minutes,
    planned_distance_km,
    type_specific_data
  FROM training_sessions
  WHERE week_plan_id = p_source_week_plan_id
    AND day_of_week  = p_source_day::day_of_week
  ORDER BY sort_order;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

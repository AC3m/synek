-- Migration 008: Replace global unique constraints on week_plans
-- with per-athlete unique constraints so multiple athletes can have
-- plans for the same calendar week.

-- Drop old global unique constraints
ALTER TABLE week_plans DROP CONSTRAINT IF EXISTS week_plans_week_start_key;
ALTER TABLE week_plans DROP CONSTRAINT IF EXISTS unique_year_week;

-- Add per-athlete unique constraints
ALTER TABLE week_plans
  ADD CONSTRAINT unique_athlete_week_start UNIQUE (athlete_id, week_start);

ALTER TABLE week_plans
  ADD CONSTRAINT unique_athlete_year_week UNIQUE (athlete_id, year, week_number);

-- Enum types
CREATE TYPE training_type AS ENUM (
  'run', 'cycling', 'strength', 'yoga', 'mobility', 'swimming', 'rest_day'
);

CREATE TYPE load_type AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

-- Week plans table
CREATE TABLE week_plans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start      DATE NOT NULL UNIQUE,
  year            INTEGER NOT NULL,
  week_number     INTEGER NOT NULL,
  load_type       load_type,
  total_planned_km DECIMAL(6,2),
  description     TEXT,
  coach_comments  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_year_week UNIQUE (year, week_number),
  CONSTRAINT valid_week_number CHECK (week_number >= 1 AND week_number <= 53)
);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_week_plans_updated
  BEFORE UPDATE ON week_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_week_plans_date ON week_plans(week_start);

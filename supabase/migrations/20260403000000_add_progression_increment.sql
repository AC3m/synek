ALTER TABLE strength_variant_exercises
  ADD COLUMN progression_increment NUMERIC(6,2) NULL
    CONSTRAINT progression_increment_positive
    CHECK (progression_increment IS NULL OR progression_increment > 0);

COMMENT ON COLUMN strength_variant_exercises.progression_increment
  IS 'Load increment applied per session when progression intent is up (subtracted for down). NULL = not configured.';

-- Add per_set_reps JSONB column to strength_variant_exercises.
-- When NULL, all sets use the uniform repsMin/repsMax values.
-- When set, contains an array of {reps_min, reps_max} objects, one per set.
ALTER TABLE strength_variant_exercises
  ADD COLUMN per_set_reps JSONB DEFAULT NULL;

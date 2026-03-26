-- Migration 024: Add per-exercise load unit to strength_variant_exercises
-- ADDITIVE ONLY — adds one nullable column with a safe default.

ALTER TABLE strength_variant_exercises
  ADD COLUMN IF NOT EXISTS load_unit text NOT NULL DEFAULT 'kg'
    CHECK (load_unit IN ('kg', 'sec'));

COMMENT ON COLUMN strength_variant_exercises.load_unit IS
  'Unit used for the load field in session logs. ''kg'' for weight-based exercises, ''sec'' for time-based exercises (e.g. planks, holds).';

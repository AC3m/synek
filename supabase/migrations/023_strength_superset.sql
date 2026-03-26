-- Migration 023: Add superset grouping to strength variant exercises
-- ADDITIVE ONLY — adds one nullable integer column.

ALTER TABLE strength_variant_exercises
  ADD COLUMN IF NOT EXISTS superset_group integer;

COMMENT ON COLUMN strength_variant_exercises.superset_group IS
  'Exercises with the same non-null superset_group value within a variant are performed as a superset (back-to-back). NULL = standalone exercise.';

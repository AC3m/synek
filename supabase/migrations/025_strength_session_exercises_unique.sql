-- Add unique constraint on (session_id, variant_exercise_id) to prevent duplicate
-- exercise entries per session that can occur from concurrent upsert calls.
-- The delete+insert pattern in upsertSessionExercises is not atomic, so a race
-- between two saves could produce duplicates without this guard.

ALTER TABLE strength_session_exercises
  ADD CONSTRAINT strength_session_exercises_session_exercise_unique
  UNIQUE (session_id, variant_exercise_id);

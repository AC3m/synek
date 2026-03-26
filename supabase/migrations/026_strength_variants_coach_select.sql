-- Migration 026: Allow coaches to SELECT their athletes' strength variants and exercises
-- Coaches need read access to view and pre-fill sessions for their athletes.
-- Write operations (INSERT/UPDATE/DELETE) remain restricted to the variant owner.

CREATE POLICY "variants_coach_select" ON strength_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM coach_athletes ca
      JOIN profiles p ON p.id = auth.uid()
      WHERE ca.athlete_id = strength_variants.user_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE POLICY "variant_exercises_coach_select" ON strength_variant_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM strength_variants sv
      JOIN coach_athletes ca ON ca.athlete_id = sv.user_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE sv.id = strength_variant_exercises.variant_id
        AND ca.coach_id = auth.uid()
        AND p.role = 'coach'
    )
  );

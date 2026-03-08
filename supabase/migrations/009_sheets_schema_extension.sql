-- Migration 009: Schema extensions for Google Sheets data migration
-- Adds actual performance fields to training_sessions,
-- coach post-training feedback, actual km to week_plans,
-- and 'other' training type.

-- Add 'other' to training_type enum
ALTER TYPE training_type ADD VALUE IF NOT EXISTS 'other';

-- Actual performance data on training_sessions
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS actual_distance_km      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS actual_pace             TEXT,
  ADD COLUMN IF NOT EXISTS avg_heart_rate          INTEGER,
  ADD COLUMN IF NOT EXISTS max_heart_rate          INTEGER,
  ADD COLUMN IF NOT EXISTS rpe                     INTEGER CHECK (rpe >= 1 AND rpe <= 10);

-- Coach post-training feedback
ALTER TABLE training_sessions
  ADD COLUMN IF NOT EXISTS coach_post_feedback TEXT;

-- Actual total km for the week
ALTER TABLE week_plans
  ADD COLUMN IF NOT EXISTS actual_total_km DECIMAL(6,2);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS training_preferences JSONB
  NOT NULL DEFAULT '{"allowSetAdjustment": true}'::jsonb;

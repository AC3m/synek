-- ============================================================
-- Migration 010: Settings schema — profile avatars + Strava token ownership
-- ============================================================

-- Add avatar URL to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- Extend strava_tokens with user ownership and metadata
-- ============================================================

ALTER TABLE strava_tokens
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS strava_athlete_name TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Ensure one Strava connection per Synek user
CREATE UNIQUE INDEX IF NOT EXISTS strava_tokens_user_id_idx ON strava_tokens (user_id);

-- ============================================================
-- RLS: profiles — allow users to update their own name + avatar
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'own_profile_update'
  ) THEN
    CREATE POLICY "own_profile_update"
      ON profiles FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- RLS: strava_tokens — users manage their own token row
-- ============================================================

ALTER TABLE strava_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'strava_tokens' AND policyname = 'own_strava_token_select'
  ) THEN
    CREATE POLICY "own_strava_token_select"
      ON strava_tokens FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'strava_tokens' AND policyname = 'own_strava_token_insert'
  ) THEN
    CREATE POLICY "own_strava_token_insert"
      ON strava_tokens FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'strava_tokens' AND policyname = 'own_strava_token_update'
  ) THEN
    CREATE POLICY "own_strava_token_update"
      ON strava_tokens FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'strava_tokens' AND policyname = 'own_strava_token_delete'
  ) THEN
    CREATE POLICY "own_strava_token_delete"
      ON strava_tokens FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

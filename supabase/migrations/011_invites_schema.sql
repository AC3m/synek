-- ============================================================
-- 011_invites_schema.sql
-- Coach-Athlete Invite: invites table, RPCs, RLS
-- ============================================================

-- ------------------------------------------------------------
-- Table: invites
-- ------------------------------------------------------------
CREATE TABLE invites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      text        NOT NULL UNIQUE,
  coach_id   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status     text        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'used', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  used_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  used_at    timestamptz
);

-- Indexes
CREATE INDEX invites_coach_id_idx   ON invites (coach_id);
-- token index already covered by the UNIQUE constraint
CREATE INDEX invites_created_at_idx ON invites (coach_id, created_at);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Coaches read their own invites
CREATE POLICY "coach_reads_own_invites"
  ON invites FOR SELECT TO authenticated
  USING (coach_id = auth.uid());

-- Coaches revoke their own pending invites
CREATE POLICY "coach_revokes_own_invites"
  ON invites FOR UPDATE TO authenticated
  USING  (coach_id = auth.uid() AND status = 'pending')
  WITH CHECK (coach_id = auth.uid() AND status = 'revoked');

-- No direct INSERT from client — only via create_invite() RPC
-- No DELETE — rows kept for audit

-- ------------------------------------------------------------
-- RPC: create_invite()
-- Called by authenticated coach.
-- Enforces 5/calendar-day rate limit (resets at midnight UTC).
-- Returns the raw invite token.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_invite()
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_token text;
  v_count integer;
BEGIN
  -- Rate-limit: count today's invites for this coach (calendar day, UTC)
  SELECT COUNT(*) INTO v_count
  FROM invites
  WHERE coach_id = auth.uid()
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  -- Limit value: see app/lib/config.ts DAILY_INVITE_LIMIT. Update both if changing.
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO invites (token, coach_id)
  VALUES (v_token, auth.uid());

  RETURN v_token;
END;
$$;

-- ------------------------------------------------------------
-- RPC: get_invite_preview(p_token text)
-- Public (anon-callable). Returns minimal invite metadata.
-- Lazily marks expired tokens.
-- Never exposes internal IDs.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_invite_preview(p_token text)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_invite  invites%ROWTYPE;
  v_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'not_found');
  END IF;

  -- Lazy expiry: update status if past expires_at
  IF v_invite.status = 'pending' AND v_invite.expires_at < now() THEN
    UPDATE invites SET status = 'expired' WHERE id = v_invite.id;
    v_invite.status := 'expired';
  END IF;

  IF v_invite.status = 'used' THEN
    RETURN json_build_object('valid', false, 'reason', 'used');
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN json_build_object('valid', false, 'reason', 'revoked');
  END IF;

  IF v_invite.status = 'expired' THEN
    RETURN json_build_object('valid', false, 'reason', 'expired');
  END IF;

  -- Valid pending invite — fetch coach name
  SELECT * INTO v_profile FROM profiles WHERE id = v_invite.coach_id;

  RETURN json_build_object(
    'valid',      true,
    'coach_name', COALESCE(v_profile.name, 'Coach')
  );
END;
$$;

-- Grant anon role the ability to call get_invite_preview
GRANT EXECUTE ON FUNCTION get_invite_preview(text) TO anon;

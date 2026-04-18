-- Atomic rate-limit check: single INSERT ... ON CONFLICT with RETURNING
-- Replaces the multi-step read-then-update in rate-limit.ts
CREATE OR REPLACE FUNCTION public.upsert_rate_limit(
  p_ip_address text,
  p_action text,
  p_window_start timestamptz,
  p_max_attempts int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public.auth_rate_limits (ip_address, action, window_start, attempt_count)
  VALUES (p_ip_address, p_action, p_window_start, 1)
  ON CONFLICT (ip_address, action, window_start)
  DO UPDATE SET attempt_count = public.auth_rate_limits.attempt_count + 1
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_max_attempts;
END;
$$;

-- Only service role may call this
REVOKE EXECUTE ON FUNCTION public.upsert_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_rate_limit TO service_role;

-- Lookup a user by email in auth.users without loading the full table.
-- Returns NULL when no user matches.
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'id', id,
    'email_confirmed_at', email_confirmed_at
  )
  FROM auth.users
  WHERE email = lookup_email
  LIMIT 1;
$$;

-- Only service role may call this
REVOKE EXECUTE ON FUNCTION public.lookup_user_by_email FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_email TO service_role;

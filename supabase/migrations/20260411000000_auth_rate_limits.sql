CREATE TABLE public.auth_rate_limits (
  ip_address    text        NOT NULL,
  action        text        NOT NULL,
  window_start  timestamptz NOT NULL,
  attempt_count int         NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_address, action, window_start)
);

-- Only service role can read/write (Edge Function uses service role client)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
-- No RLS policies needed: Edge Function uses service-role key (bypasses RLS)

-- Index for cleanup queries on older windows
CREATE INDEX ON public.auth_rate_limits (window_start);

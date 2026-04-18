// checkAndIncrementRateLimit — atomically records an attempt and returns whether it is allowed.
//
// Delegates to the `upsert_rate_limit` Postgres function which performs a single
// INSERT ... ON CONFLICT DO UPDATE ... RETURNING, guaranteeing atomicity even under
// concurrent requests (no TOCTOU race).

export async function checkAndIncrementRateLimit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ip: string,
  action: string,
  windowMinutes: number,
  maxAttempts: number,
): Promise<boolean> {
  const now = new Date();
  const bucket = new Date(
    Math.floor(now.getTime() / (windowMinutes * 60 * 1000)) * (windowMinutes * 60 * 1000),
  );

  const { data, error } = await supabase.rpc('upsert_rate_limit', {
    p_ip_address: ip,
    p_action: action,
    p_window_start: bucket.toISOString(),
    p_max_attempts: maxAttempts,
  });

  if (error) {
    console.log('[rate-limit] RPC error, failing open', { error: error.message });
    return true;
  }

  return data as boolean;
}

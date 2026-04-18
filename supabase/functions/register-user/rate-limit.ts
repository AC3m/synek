// checkAndIncrementRateLimit — atomically records an attempt and returns whether it is allowed.
//
// Uses an upsert on auth_rate_limits: on insert the row is created with attempt_count = 1;
// on conflict the count is incremented. Returns true if the attempt is within the allowed
// limit, false if it should be rejected.

export async function checkAndIncrementRateLimit(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ip: string,
  action: string,
  windowMinutes: number,
  maxAttempts: number,
): Promise<boolean> {
  // Truncate current time to window bucket
  const now = new Date();
  const bucket = new Date(
    Math.floor(now.getTime() / (windowMinutes * 60 * 1000)) * (windowMinutes * 60 * 1000),
  );

  const { data, error } = await supabase
    .from('auth_rate_limits')
    .upsert(
      {
        ip_address: ip,
        action,
        window_start: bucket.toISOString(),
        attempt_count: 1,
      },
      {
        onConflict: 'ip_address,action,window_start',
        ignoreDuplicates: false,
      },
    )
    .select('attempt_count')
    .single();

  if (error) {
    // On upsert conflict, Supabase JS may not return the row. Re-fetch it.
    const { data: existing } = await supabase
      .from('auth_rate_limits')
      .select('attempt_count')
      .eq('ip_address', ip)
      .eq('action', action)
      .eq('window_start', bucket.toISOString())
      .single();

    if (existing) {
      // Increment separately
      await supabase
        .from('auth_rate_limits')
        .update({ attempt_count: existing.attempt_count + 1 })
        .eq('ip_address', ip)
        .eq('action', action)
        .eq('window_start', bucket.toISOString());

      return existing.attempt_count < maxAttempts;
    }
    // If we can't read the count, fail open (allow) to avoid blocking legitimate users
    return true;
  }

  const count = (data as { attempt_count: number } | null)?.attempt_count ?? 1;
  return count <= maxAttempts;
}

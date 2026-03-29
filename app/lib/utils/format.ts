/**
 * Format seconds to a time string (e.g. "1:23:45" or "5:30")
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format minutes to a value+unit pair (e.g. { value: "2h 30", unit: "min" })
 */
export function formatDuration(minutes: number): { value: string; unit: string } {
  if (minutes === 0) return { value: '0', unit: 'min' };
  if (minutes < 60) return { value: minutes.toString(), unit: 'min' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return { value: h.toString(), unit: 'h' };
  return { value: `${h}h ${m}`, unit: 'min' };
}

/**
 * Format minutes to a compact string (e.g. "2h 30m" or null for 0)
 */
export function formatDurationCompact(min: number): string | null {
  if (min === 0) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

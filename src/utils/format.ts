/**
 * Converts a duration in seconds to a mm:ss string.
 * e.g. 75 → "1:15", 3600 → "60:00"
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

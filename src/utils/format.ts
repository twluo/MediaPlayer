/**
 * Converts a duration in seconds to a mm:ss string.
 * e.g. 75 → "1:15", 3600 → "60:00"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds - 3600 * hours) / 60);
  const secs = Math.floor(seconds - 3600 * hours - 60 * mins);
  const hoursString = hours != 0 ? `${hours}:` : ``;
  const minsString =
    hours != 0 ? `${mins.toString().padStart(2, "0")}:` : `${mins}:`;
  const secsString = `${secs.toString().padStart(2, "0")}`;
  return `${hoursString}${minsString}${secsString}`;
}

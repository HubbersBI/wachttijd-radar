/** Dutch formatting. A figure is never shown without the date it was reported. */

const MONTHS = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

/** "2026-08-18T08:00:00Z" -> "18 aug 2026" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** Days as a readable span. Weeks are given alongside because treeknormen are in weeks. */
export function formatWait(days: number): string {
  if (days === 0) return "geen wachttijd";
  if (days === 1) return "1 dag";
  return `${days} dagen`;
}

/** Bar width as a percentage of the longest wait in the list, with a visible floor. */
export function barWidth(days: number, longest: number): string {
  if (longest <= 0) return "2%";
  return `${Math.max(1.5, (days / longest) * 100)}%`;
}

/** Round ticks for the shared axis: 0, then even steps up to the longest wait. */
export function axisTicks(longest: number, count = 5): number[] {
  if (longest <= 0) return [0];
  const raw = longest / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = Math.ceil(raw / magnitude) * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value <= longest; value += step) ticks.push(value);
  return ticks;
}

/** Points that carry a number, oldest first. Reports without one cannot be plotted. */
export function measuredHistory(history: { days: number | null }[]): number[] {
  return history.filter((point) => point.days !== null).map((point) => point.days!);
}

/**
 * Change between the first and last measured report.
 *
 * Null when there is nothing to compare: a single report is a point, not a trend,
 * and must never be drawn as movement.
 */
export function trend(history: { days: number | null }[]): number | null {
  const measured = measuredHistory(history);
  if (measured.length < 2) return null;
  return measured[measured.length - 1] - measured[0];
}

/** "+166 dagen" / "-12 dagen", with the sign always shown. */
export function formatTrend(change: number): string {
  const sign = change > 0 ? "+" : "\u2212";
  return `${sign}${Math.abs(change)} ${Math.abs(change) === 1 ? "dag" : "dagen"}`;
}

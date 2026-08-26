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

/**
 * The norm in weeks, as a label.
 *
 * A behandeling shows "6 of 7 weken" because TH/BR-025 sets 6 weeks for poliklinische
 * and 7 for klinische behandeling, while the source submits both as one category and
 * does not say which. RIVM publishes the same figures the same way.
 */
export function normLabel(norm: [number, number]): string {
  const [strict, lenient] = norm;
  const weeks = (days: number) => days / 7;
  return strict === lenient
    ? `${weeks(strict)} weken`
    : `${weeks(strict)} of ${weeks(lenient)} weken`;
}

/** Position on the scale as a percentage, for the norm marker. */
export function scalePosition(days: number, scaleMax: number): string {
  return `${Math.min(100, (days / scaleMax) * 100)}%`;
}

import type { WachttijdenResponse } from "@/lib/api";

/**
 * Narrow a treatment's rows to a city and a deadline, in the browser.
 *
 * The static build ships one file per treatment and filters here, because a file per
 * city would turn 113 files into thousands. This mirrors `_answer` in the backend
 * exactly - including the part that matters most:
 *
 * A location that reported no figure cannot be said to meet a deadline, so it leaves
 * the results when one is set. It is counted in `unreported` instead. Dropping it
 * silently would make the answer look more complete than it is.
 */
export function narrow(
  answer: WachttijdenResponse,
  { city, maxDays }: { city?: string | null; maxDays?: number | null },
): WachttijdenResponse {
  // COLLATE NOCASE in the query this replaces.
  const found = city
    ? answer.results.filter((row) => row.city?.toLowerCase() === city.toLowerCase())
    : answer.results;

  const results =
    maxDays == null
      ? found
      : found.filter((row) => row.days !== null && row.days <= maxDays);

  return {
    ...answer,
    city: city ?? null,
    max_days: maxDays ?? null,
    count: results.length,
    considered: found.length,
    unreported: maxDays == null ? 0 : found.filter((row) => row.days === null).length,
    results,
  };
}

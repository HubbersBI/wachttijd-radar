import { describe, expect, it } from "vitest";

import type { Wachttijd, WachttijdenResponse } from "@/lib/api";
import { narrow } from "@/lib/query";

function row(days: number | null, city: string): Wachttijd {
  return {
    location_key: `${city}-${days}`,
    care_provider: "Ziekenhuis",
    location: `Locatie ${city}`,
    postal_code: null,
    city,
    treatment_key: "key",
    treatment: "Initiële staaroperatie",
    treatment_type: "Behandeling",
    specialism: "oogheelkunde",
    days,
    insufficient_observations: days === null,
    supplied_at: "2026-08-18T08:00:00.000Z",
    fetched_at: "2026-08-26T09:00:00.000Z",
    norm_days: [42, 49],
    norm_verdict: days === null ? null : days > 49 ? "exceeded" : "within",
  };
}

const answer: WachttijdenResponse = {
  treatment_key: "key",
  treatment: "Initiële staaroperatie",
  treatment_type: "Behandeling",
  city: null,
  max_days: null,
  count: 4,
  considered: 4,
  unreported: 0,
  source: "Nederlandse Zorgautoriteit (NZa)",
  norm_days: [42, 49],
  norm_source: "TH/BR-025",
  results: [row(10, "Amsterdam"), row(60, "Amsterdam"), row(20, "Utrecht"), row(null, "Utrecht")],
};

describe("narrow", () => {
  it("filters to a city and recounts against what is left", () => {
    const result = narrow(answer, { city: "Amsterdam" });
    expect(result.results.map((r) => r.days)).toEqual([10, 60]);
    expect(result.count).toBe(2);
    expect(result.considered).toBe(2);
    expect(result.city).toBe("Amsterdam");
  });

  it("matches a city whatever its case, as COLLATE NOCASE does", () => {
    expect(narrow(answer, { city: "aMSTERDAM" }).count).toBe(2);
  });

  it("applies a deadline", () => {
    const result = narrow(answer, { maxDays: 30 });
    expect(result.results.map((r) => r.days)).toEqual([10, 20]);
    expect(result.max_days).toBe(30);
  });

  it("counts a location with no figure as unreported rather than dropping it silently", () => {
    const result = narrow(answer, { maxDays: 30 });
    // The row with null days is not in the results - it cannot be said to meet a
    // deadline - but the answer still says it was there.
    expect(result.results.some((r) => r.days === null)).toBe(false);
    expect(result.unreported).toBe(1);
    expect(result.considered).toBe(4);
  });

  it("leaves every row in place, and unreported at zero, with no deadline", () => {
    const result = narrow(answer, {});
    expect(result.results).toHaveLength(4);
    expect(result.unreported).toBe(0);
    expect(result.max_days).toBeNull();
  });

  it("combines a city and a deadline", () => {
    const result = narrow(answer, { city: "Utrecht", maxDays: 30 });
    expect(result.count).toBe(1);
    expect(result.considered).toBe(2);
    expect(result.unreported).toBe(1);
  });
});

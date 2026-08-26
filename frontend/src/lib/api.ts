/** Shapes returned by the backend. Every wait arrives with its dates and its flag. */

export type Treatment = {
  treatment_key: string;
  treatment: string;
  specialism: string | null;
  treatment_type: string;
  location_count: number;
  /** The norm this treatment is judged against, in days: [strictest, most lenient]. */
  norm_days: [number, number] | null;
};

export type Wachttijd = {
  location_key: string;
  care_provider: string;
  location: string;
  postal_code: string | null;
  city: string | null;
  treatment_key: string;
  treatment: string;
  treatment_type: string;
  specialism: string | null;
  /** Days. Null when the source reported insufficient observations. */
  days: number | null;
  insufficient_observations: boolean;
  /** When the provider reported the figure. */
  supplied_at: string;
  /** When we pulled it. */
  fetched_at: string;
  /** The norm in days: [strictest, most lenient]. A pair when the source cannot say. */
  norm_days: [number, number] | null;
  /** "within" | "exceeded" | "depends". Null when there is no wait to judge. */
  norm_verdict: Verdict | null;
};

export type Verdict = "within" | "exceeded" | "depends";

export type WachttijdenResponse = {
  treatment_key: string;
  treatment: string;
  treatment_type: string;
  city: string | null;
  count: number;
  source: string;
  norm_days: [number, number] | null;
  norm_source: string;
  results: Wachttijd[];
};

export type Health = {
  status: string;
  rows: number;
  fetched_at: string | null;
  latest_report: string | null;
  source: string;
};

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} gaf ${response.status}`);
  return response.json();
}

export const getHealth = () => get<Health>("/api/health");

export const getTreatments = () =>
  get<{ treatments: Treatment[] }>("/api/treatments").then((body) => body.treatments);

export function getWachttijden(treatmentKey: string, city?: string) {
  const params = new URLSearchParams({ treatment_key: treatmentKey });
  if (city) params.set("city", city);
  return get<WachttijdenResponse>(`/api/wachttijden?${params}`);
}

/** Shapes returned by the backend. Every wait arrives with its dates and its flag. */

export type Treatment = {
  treatment_key: string;
  treatment: string;
  specialism: string | null;
  treatment_type: string;
  location_count: number;
};

export type HistoryPoint = {
  /** Days. Null when that report had insufficient observations. */
  days: number | null;
  insufficient_observations: boolean;
  supplied_at: string;
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
  /** Every report for this location and treatment, oldest first. */
  history: HistoryPoint[];
};

export type WachttijdenResponse = {
  treatment_key: string;
  treatment: string;
  treatment_type: string;
  city: string | null;
  count: number;
  source: string;
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

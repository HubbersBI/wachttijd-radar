/** Shapes returned by the backend. Every wait arrives with its dates and its flag. */

import { parseWithRules } from "@/lib/assistant";
import { narrow } from "@/lib/query";

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
  max_days: number | null;
  count: number;
  /** How many locations were looked at before the deadline was applied. */
  considered: number;
  /** How many of those reported no figure, so could not be said to meet it. */
  unreported: number;
  source: string;
  norm_days: [number, number] | null;
  norm_source: string;
  results: Wachttijd[];
};

export type Health = {
  status: string;
  rows: number;
  providers: number;
  locations: number;
  treatments: number;
  fetched_at: string | null;
  latest_report: string | null;
  source: string;
};

/**
 * The static build answers from flat JSON written at build time, with no backend.
 *
 * Between two fetches every read endpoint returns the same thing - the figures change
 * biweekly and the API only ever returns now - so a public deployment does not need a
 * server. Unset, this is the live API exactly as before, which is what runs in Docker.
 *
 * BASE_PATH is for a host that serves the site from a subdirectory, such as a GitHub
 * Pages project site. Empty at a domain root.
 */
const STATIC = process.env.NEXT_PUBLIC_WACHTTIJD_STATIC === "true";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const isStatic = STATIC;

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} gaf ${response.status}`);
  return response.json();
}

export const getHealth = () =>
  get<Health>(STATIC ? `${BASE_PATH}/api/health.json` : "/api/health");

export const getTreatments = () =>
  get<{ treatments: Treatment[] }>(
    STATIC ? `${BASE_PATH}/api/treatments.json` : "/api/treatments",
  ).then((body) => body.treatments);

/** Every city with a reported location, longest first. Only the static build reads it:
 *  with no backend to read a question, the rules parser runs in the browser. */
export const getCities = () =>
  get<{ cities: string[] }>(`${BASE_PATH}/api/cities.json`).then((body) => body.cities);

export function getWachttijden(treatmentKey: string, city?: string) {
  if (STATIC) {
    return get<WachttijdenResponse>(
      `${BASE_PATH}/api/wachttijden/${treatmentKey}.json`,
    ).then((answer) => narrow(answer, { city }));
  }
  const params = new URLSearchParams({ treatment_key: treatmentKey });
  if (city) params.set("city", city);
  return get<WachttijdenResponse>(`/api/wachttijden?${params}`);
}

export type Understood = {
  treatment_key: string | null;
  city: string | null;
  max_days: number | null;
  within_norm: boolean;
  /** "groq" when a model read the question, "rules" when the fallback did. */
  read_by: string;
};

export type AssistantReply = {
  understood: Understood;
  error?: string;
  answer?: WachttijdenResponse;
};

export async function ask(question: string): Promise<AssistantReply> {
  if (STATIC) return askHere(question);
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`/api/assistant gaf ${response.status}`);
  return response.json();
}

/**
 * The same answer, assembled in the browser. Mirrors `ask` in `backend/app/main.py`.
 *
 * The question never leaves the page: it is read by the rules parser here, and the
 * figures come from the treatment's own file. There is no request carrying it
 * anywhere, so there is nothing to log and nothing to leak.
 */
async function askHere(question: string): Promise<AssistantReply> {
  const [treatments, cities] = await Promise.all([getTreatments(), getCities()]);
  const understood = parseWithRules(question, treatments, cities);

  if (!understood.treatment_key) {
    return { understood, error: "Ik kon er geen behandeling in herkennen." };
  }

  const full = await get<WachttijdenResponse>(
    `${BASE_PATH}/api/wachttijden/${understood.treatment_key}.json`,
  );
  const inCity = narrow(full, { city: understood.city });
  if (inCity.considered === 0) {
    return {
      understood,
      error: `Geen locaties gevonden voor deze behandeling${
        understood.city ? ` in ${understood.city}` : ""
      }.`,
    };
  }

  // "binnen de treeknorm" is a deadline too, but which one depends on the treatment,
  // so it can only be resolved now that the treatment is known.
  let maxDays = understood.max_days;
  if (maxDays === null && understood.within_norm && full.norm_days) {
    maxDays = full.norm_days[0];
  }

  return {
    understood: { ...understood, max_days: maxDays },
    answer: narrow(full, { city: understood.city, maxDays }),
  };
}

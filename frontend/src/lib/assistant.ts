import type { Treatment, Understood } from "@/lib/api";

/**
 * Reading a question in plain Dutch, in the browser.
 *
 * A direct port of `parse_with_rules` in `backend/app/assistant.py`, kept behaviourally
 * identical to it - the tests on both sides assert the same readings.
 *
 * Why it lives here at all: the served build has no backend to send a question to, and
 * the alternative was a serverless function holding a model key. That would mean real
 * health questions from strangers leaving the browser for a model vendor with no
 * processor agreement, which is the one gap the project has knowingly left open. Doing
 * the parse here closes it - nothing typed into the box goes anywhere.
 *
 * As in the backend, this only ever produces a *query*: a treatment, a city, a
 * deadline. It never writes an answer, so it can neither round a figure nor advise.
 */

const UNITS: Record<string, number> = {
  dag: 1,
  dagen: 1,
  week: 7,
  weken: 7,
  maand: 30,
  maanden: 30,
};

// Words that appear in dozens of treatment names carry no signal, and through the
// compound rule below they actively mislead: without this, "staaroperatie" matches
// "Aortocoronaire bypass-operatie".
const STOPWORDS = new Set([
  "ik", "wil", "een", "de", "het", "in", "voor", "met", "van", "op", "en", "of",
  "binnen", "week", "weken", "dag", "dagen", "maand", "maanden", "afspraak",
  "wachttijd", "wachttijden", "zoek", "waar", "kan", "terecht", "graag", "mijn",
  "operatie", "operatieve", "behandeling", "behandelingen", "onderzoek", "initiele",
  "initiële", "totale", "verrichting", "zelfstandige", "algemeen", "overige",
  "diagnostiek", "consult", "als", "bij", "aan", "naar", "niet",
]);

const WORDS = /[a-zà-ÿ]+/g;

export function parseWithRules(
  question: string,
  treatments: Treatment[],
  cities: string[],
): Understood {
  const lowered = question.toLowerCase();
  return {
    treatment_key: matchTreatment(lowered, treatments),
    city: matchCity(lowered, cities),
    max_days: matchDeadline(lowered),
    within_norm: lowered.includes("treeknorm"),
    read_by: "rules",
  };
}

/** Cities arrive longest first, so a longer name wins over one contained in it. */
function matchCity(lowered: string, cities: string[]): string | null {
  for (const city of cities) {
    if (new RegExp(`\\b${escape(city.toLowerCase())}\\b`).test(lowered)) return city;
  }
  return null;
}

function matchDeadline(lowered: string): number | null {
  const match = lowered.match(/binnen\s+(\d+)\s*(dag|dagen|week|weken|maand|maanden)/);
  if (match) return Number(match[1]) * UNITS[match[2]];
  if (/binnen\s+een\s+maand/.test(lowered)) return 30;
  if (/binnen\s+een\s+week/.test(lowered)) return 7;
  return null;
}

/**
 * The treatment whose name shares the most meaningful words with the question.
 *
 * Dutch compounds, so a word counts when it is contained in one of the other's words
 * as well as when it matches outright: "staaroperatie" has to find "staar", and
 * "knieoperatie" has to find "knie". Four characters is the floor, or short fragments
 * match everything.
 */
function matchTreatment(lowered: string, treatments: Treatment[]): string | null {
  const asked = new Set(words(lowered));
  let best: string | null = null;
  let bestScore = 0;
  for (const treatment of treatments) {
    const named = new Set(words(treatment.treatment.toLowerCase()));
    let score = 0;
    for (const word of named) score += weigh(word, asked);
    if (score > bestScore) {
      best = treatment.treatment_key;
      bestScore = score;
    }
  }
  return best;
}

function words(text: string): string[] {
  return (text.match(WORDS) ?? []).filter((word) => !STOPWORDS.has(word));
}

/** An exact word beats a compound, so "staaroperatie" prefers the staar treatment
 *  over anything that merely ends in the same syllables. */
function weigh(word: string, asked: Set<string>): number {
  if (asked.has(word)) return 2;
  if (word.length < 4) return 0;
  for (const other of asked) {
    if (other.length >= 4 && (other.includes(word) || word.includes(other))) return 1;
  }
  return 0;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

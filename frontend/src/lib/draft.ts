/**
 * The zorgbemiddeling request, drafted from figures the source actually reported.
 *
 * Deliberately a pure function in the browser. The draft names someone's treatment
 * and their wait, which is health data about them, and CLAUDE.md forbids persisting
 * it. Generating it here means their name and insurer never reach the server, so
 * there is nothing to log, store or leak - a guarantee rather than a policy.
 *
 * Nothing here is invented. Every figure comes from the row, every date from the
 * report it belongs to, and the norm from the regulation.
 */

import type { Wachttijd } from "@/lib/api";
import { formatDate } from "@/lib/format";

export type DraftInput = {
  row: Wachttijd;
  norm: [number, number];
  /** Held in component state only - never stored, never sent to our server. */
  name: string;
  insurer: string;
};

const PLACEHOLDER_NAME = "[uw naam]";
const PLACEHOLDER_INSURER = "[uw zorgverzekeraar]";

/** Many location names already carry their city - "Sint Antonius Ziekenhuis Locatie
 *  Utrecht" should not become "..., Utrecht". */
function placeOf(row: Wachttijd): string {
  if (!row.city) return row.location;
  return row.location.toLowerCase().includes(row.city.toLowerCase())
    ? row.location
    : `${row.location}, ${row.city}`;
}

function normSentence(norm: [number, number], days: number): string {
  const [strict, lenient] = norm;
  if (strict === lenient) {
    const weeks = strict / 7;
    return (
      `De treeknorm hiervoor is ${weeks} weken (${strict} dagen). ` +
      `De gemelde wachttijd ligt daar ${days - strict} dagen boven.`
    );
  }
  if (days > lenient) {
    return (
      `De treeknorm voor een behandeling is 6 weken bij poliklinische en 7 weken bij ` +
      `klinische behandeling (42 tot 49 dagen). De gemelde wachttijd ligt daar ` +
      `${days - lenient} dagen boven, ongeacht welke van de twee van toepassing is.`
    );
  }
  return (
    `De treeknorm voor een behandeling is 6 weken bij poliklinische en 7 weken bij ` +
    `klinische behandeling (42 tot 49 dagen). De gemelde wachttijd ligt boven de norm ` +
    `van 6 weken. De bron vermeldt niet of deze behandeling poliklinisch of klinisch is.`
  );
}

/** Subject line for the mail. Kept short and specific - it is what an insurer sorts on. */
export function draftSubject(row: Wachttijd): string {
  return `Verzoek om zorgbemiddeling - ${row.treatment}`;
}

/** The parts every request shares, whatever the wait was measured from. */
function compose({
  insurer,
  opening,
  facts,
  norm,
  days,
  name,
}: {
  insurer: string;
  opening: string;
  facts: string[];
  norm: [number, number];
  days: number;
  name: string;
}): string {
  return [
    "Betreft: verzoek om zorgbemiddeling",
    "",
    "Geachte heer/mevrouw,",
    "",
    `Ik ben verzekerd bij ${insurer.trim() || PLACEHOLDER_INSURER}. ${opening}`,
    "",
    ...facts,
    "",
    normSentence(norm, days),
    "",
    // Deliberately does not name an alternative. Which provider is suitable, and how
    // far someone can reasonably travel, is the insurer's obligation to work out -
    // naming one narrows a request that should stay open.
    "Op grond van uw zorgplicht verzoek ik u te bemiddelen naar een zorgaanbieder " +
      "waar ik wel binnen de treeknorm terecht kan, zo dicht mogelijk bij mijn " +
      "woonplaats, en mij te laten weten wat daarvan het resultaat is.",
    "",
    "Met vriendelijke groet,",
    name.trim() || PLACEHOLDER_NAME,
  ].join("\n");
}

/** A request built from a waiting time the provider reported to the NZa. */
export function buildDraft({ row, norm, name, insurer }: DraftInput): string {
  const days = row.days;
  if (days === null) throw new Error("Geen wachttijd om te melden");

  return compose({
    insurer,
    opening:
      "Ik wacht op de onderstaande behandeling en verzoek u om zorgbemiddeling.",
    facts: [
      `Behandeling:        ${row.treatment}`,
      `Zorgaanbieder:      ${placeOf(row)}`,
      `Gemelde wachttijd:  ${days} dagen`,
      `Gemeld op:          ${formatDate(row.supplied_at)}`,
      "Bron:               Nederlandse Zorgautoriteit, Zorgbeeldportaal",
    ],
    norm,
    days,
    name,
  });
}

export type AppointmentInput = {
  treatment: string;
  norm: [number, number];
  provider: string;
  /** ISO date of the appointment the person has been given. */
  appointmentDate: string;
  name: string;
  insurer: string;
  /** Injected in tests; defaults to today. */
  today?: Date;
};

/** Whole days from today until the appointment. Negative once it is in the past. */
export function daysUntil(appointmentDate: string, today: Date = new Date()): number {
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, month, day] = appointmentDate.split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - start) / 86400000);
}

/**
 * A request built from the appointment someone has actually been given.
 *
 * Most people who need bemiddeling already have a date; their own wait is better
 * evidence for them than a national median, and it is attributed to them rather than
 * to the NZa so the two are never confused.
 */
export function buildAppointmentDraft({
  treatment,
  norm,
  provider,
  appointmentDate,
  name,
  insurer,
  today,
}: AppointmentInput): string {
  const days = daysUntil(appointmentDate, today);
  if (days <= 0) throw new Error("De afspraak ligt niet in de toekomst");

  return compose({
    insurer,
    opening:
      "Ik heb voor de onderstaande behandeling een afspraak gekregen, maar de " +
      "wachttijd daarnaartoe is langer dan de treeknorm. Ik verzoek u om " +
      "zorgbemiddeling.",
    facts: [
      `Behandeling:        ${treatment}`,
      `Zorgaanbieder:      ${provider.trim() || "[naam zorgaanbieder]"}`,
      `Datum afspraak:     ${formatDate(appointmentDate)}`,
      `Wachttijd:          ${days} dagen vanaf vandaag`,
      "Bron:               de afspraak die mij is gegeven",
    ],
    norm,
    days,
    name,
  });
}

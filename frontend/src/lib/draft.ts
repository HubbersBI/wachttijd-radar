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

export function buildDraft({ row, norm, name, insurer }: DraftInput): string {
  const days = row.days;
  if (days === null) throw new Error("Geen wachttijd om te melden");

  const lines = [
    "Betreft: verzoek om zorgbemiddeling",
    "",
    "Geachte heer/mevrouw,",
    "",
    `Ik ben verzekerd bij ${insurer.trim() || PLACEHOLDER_INSURER} en wacht op de ` +
      "onderstaande behandeling. Ik verzoek u om zorgbemiddeling.",
    "",
    `Behandeling:        ${row.treatment}`,
    `Zorgaanbieder:      ${placeOf(row)}`,
    `Gemelde wachttijd:  ${days} dagen`,
    `Gemeld op:          ${formatDate(row.supplied_at)}`,
    "Bron:               Nederlandse Zorgautoriteit, Zorgbeeldportaal",
    "",
    normSentence(norm, days),
  ];

  lines.push(
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
  );

  return lines.join("\n");
}

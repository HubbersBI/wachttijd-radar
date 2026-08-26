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
  /** The shortest wait found for the same treatment, if any, to cite as an alternative. */
  alternative: Wachttijd | null;
  /** Optional, and only ever held in component state - never stored. */
  name: string;
  insurer: string;
};

const PLACEHOLDER_NAME = "[uw naam]";
const PLACEHOLDER_INSURER = "[naam zorgverzekeraar]";

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

export function buildDraft({ row, norm, alternative, name, insurer }: DraftInput): string {
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

  // Only worth citing if it is somewhere else, and shorter. Otherwise the request
  // would point the insurer back at the provider it is complaining about.
  const worthCiting =
    alternative !== null &&
    alternative.days !== null &&
    alternative.location_key !== row.location_key &&
    alternative.days < days;

  if (worthCiting && alternative) {
    lines.push(
      "",
      `Volgens dezelfde bron meldt ${placeOf(alternative)} voor dezelfde behandeling ` +
        `een wachttijd van ${alternative.days} dagen, gemeld op ` +
        `${formatDate(alternative.supplied_at)}.`,
    );
  }

  lines.push(
    "",
    "Op grond van uw zorgplicht verzoek ik u te bemiddelen naar een zorgaanbieder " +
      "waar ik binnen de treeknorm terecht kan, en mij te laten weten wat daarvan " +
      "het resultaat is.",
    "",
    "Met vriendelijke groet,",
    name.trim() || PLACEHOLDER_NAME,
  );

  return lines.join("\n");
}

"use client";

import { useState } from "react";

import { Scale } from "@/components/Scale";
import { WaitRow } from "@/components/WaitRow";
import type { AssistantReply, Treatment } from "@/lib/api";
import { ask } from "@/lib/api";
import { normLabel } from "@/lib/format";

const EXAMPLES = [
  "MRI heup in Amsterdam binnen 4 weken",
  "staaroperatie in Utrecht binnen de treeknorm",
  "CT binnen 2 weken in Rotterdam",
];

/**
 * A question in plain Dutch, answered with rows from the database.
 *
 * Rendered inside AssistantDrawer, which supplies the panel and its padding.
 *
 * What the assistant understood is printed back before the answer. With 113
 * bureaucratic treatment names it will sometimes pick the wrong one, and someone who
 * can see that it searched for "MRI heup" rather than "heupvervanging" can correct it.
 * An answer without that is just a list you have to take on trust.
 */
export function Assistant({ treatments }: { treatments: Treatment[] }) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setFailed(false);
    try {
      setReply(await ask(question));
    } catch {
      setFailed(true);
      setReply(null);
    } finally {
      setBusy(false);
    }
  }

  const answer = reply?.answer;
  const understood = reply?.understood;
  const name = understood?.treatment_key
    ? treatments.find((t) => t.treatment_key === understood.treatment_key)?.treatment
    : null;

  const measured = (answer?.results ?? []).filter((row) => row.days !== null);
  const scaleMax = Math.max(
    ...measured.map((row) => row.days!),
    answer?.norm_days ? answer.norm_days[1] : 0,
    1,
  );

  return (
    <section className="pt-4">
      <form onSubmit={submit}>
        <label htmlFor="vraag" className="block text-[14px] leading-relaxed">
          <strong className="font-semibold">Vraag het in uw eigen woorden.</strong>{" "}
          Bijvoorbeeld: waar kan ik snel terecht, en binnen welke termijn.
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="vraag"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="MRI heup in Amsterdam binnen 4 weken"
            className="flex-1 border border-ink bg-paper-hi px-3 py-2.5 text-[15px]"
          />
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="shrink-0 border border-ink bg-ink px-4 py-2.5 text-[13px] text-paper disabled:border-rule-hi disabled:bg-transparent disabled:text-ink-faint"
          >
            {busy ? "Bezig…" : "Zoek"}
          </button>
        </div>
      </form>

      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuestion(example)}
            className="underline underline-offset-2"
          >
            {example}
          </button>
        ))}
      </p>

      {failed && (
        <p className="mt-4 border-l-2 border-ink pl-4 text-[14px]">
          De zoekhulp is niet bereikbaar. Gebruik de keuzelijsten hieronder.
        </p>
      )}

      {understood && (
        <div className="mt-5 border-t border-rule pt-4">
          {/* Printed back so a wrong reading is visible rather than silent. */}
          <p className="tabular text-[11px] tracking-[0.1em] text-ink-dim uppercase">
            gezocht op
          </p>
          <p className="mt-1 text-[14px]">
            {name ?? <span className="text-ink-faint">geen behandeling herkend</span>}
            {understood.city && ` · ${understood.city}`}
            {understood.max_days !== null && ` · binnen ${understood.max_days} dagen`}
            {answer?.norm_days && understood.within_norm && (
              <span className="text-ink-dim"> (treeknorm {normLabel(answer.norm_days)})</span>
            )}
          </p>
          {understood.read_by === "rules" && (
            <p className="mt-1 text-[11px] text-ink-faint">
              Gelezen zonder taalmodel. Klopt de behandeling niet? Kies hem hieronder.
            </p>
          )}
        </div>
      )}

      {reply?.error && (
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed">
          {reply.error} Probeer de naam van het onderzoek of de operatie, of kies
          hieronder uit de lijst.
        </p>
      )}

      {answer && (
        <div className="mt-4">
          <p className="tabular text-[13px] text-ink-dim">
            {answer.count} van de {answer.considered}{" "}
            {answer.considered === 1 ? "locatie" : "locaties"}
            {answer.max_days !== null && ` binnen ${answer.max_days} dagen`}
            {answer.unreported > 0 &&
              ` · ${answer.unreported} zonder gemelde wachttijd, die kunnen we niet meetellen`}
          </p>

          {answer.count > 0 ? (
            <div className="mt-5">
              <Scale longest={scaleMax} norm={answer.norm_days} />
              <ol className="mt-2">
                {answer.results.map((row) => (
                  <WaitRow
                    key={row.location_key}
                    row={row}
                    longest={scaleMax}
                    norm={answer.norm_days}
                    showCity={!answer.city}
                  />
                ))}
              </ol>
            </div>
          ) : (
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed">
              Geen enkele locatie meldt een wachttijd binnen die termijn. Zoek hieronder
              zonder termijn om te zien wat er wel gemeld wordt.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";

import type { Wachttijd } from "@/lib/api";
import { buildDraft, draftSubject } from "@/lib/draft";
import { byConcern, emailFor, findInsurer } from "@/lib/insurers";

/**
 * The zorgbemiddeling request, drafted and handed to the person's own mail client.
 *
 * Everything happens in this component. What someone fills in here is health data
 * about them, so it is held in component state and nowhere else: not sent to our
 * server, not written to localStorage, not kept when the panel closes.
 *
 * The request goes out through mailto: rather than through a backend. The letter then
 * travels from the person's own mailbox to their own insurer and never passes through
 * us, which is what keeps the guarantee above true while still actually sending it.
 */
export function DraftPanel({
  row,
  norm,
  alternative,
  onClose,
}: {
  row: Wachttijd;
  norm: [number, number];
  alternative: Wachttijd | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [insurerName, setInsurerName] = useState("");

  const insurer = findInsurer(insurerName);
  const text = buildDraft({ row, norm, alternative, name, insurer: insurerName });
  const ready = name.trim().length > 0 && insurer !== null;

  const mailto = insurer
    ? `mailto:${emailFor(insurer)}?subject=${encodeURIComponent(draftSubject(row))}` +
      `&body=${encodeURIComponent(text)}`
    : "";

  return (
    <div className="mt-3 border border-ink bg-paper-hi p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="text-[14px] font-semibold">Verzoek om zorgbemiddeling</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-[12px] text-ink-dim underline underline-offset-2"
        >
          sluiten
        </button>
      </div>

      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink-dim">
        Zorgbemiddeling loopt via uw eigen zorgverzekeraar: die heeft de zorgplicht.
        Vul uw naam in en kies uw verzekeraar, dan opent het verzoek in uw
        e-mailprogramma. De tekst gaat rechtstreeks van u naar uw verzekeraar en komt
        nergens anders langs.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
            Uw naam
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
            required
            placeholder="voor- en achternaam"
            className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
            Uw zorgverzekeraar
          </span>
          <select
            value={insurerName}
            onChange={(event) => setInsurerName(event.target.value)}
            required
            className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
          >
            <option value="">Kies uw zorgverzekeraar</option>
            {byConcern().map((group) => (
              <optgroup key={group.concern} label={group.concern}>
                {group.insurers.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <pre className="tabular mt-4 max-h-80 overflow-auto border border-rule bg-paper p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {ready ? (
          <a
            href={mailto}
            className="border border-ink bg-ink px-4 py-2 text-[13px] text-paper no-underline"
          >
            Open het verzoek in uw e-mail
          </a>
        ) : (
          <span className="cursor-not-allowed border border-rule-hi px-4 py-2 text-[13px] text-ink-faint">
            Open het verzoek in uw e-mail
          </span>
        )}
        <span className="tabular text-[11px] text-ink-faint">
          {ready
            ? `wordt geadresseerd aan ${emailFor(insurer!)}`
            : "vul uw naam in en kies uw zorgverzekeraar"}
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Dit is een demonstratie. De adressen eindigen op .invalid en bestaan niet, dus
        er wordt niets naar een echte zorgverzekeraar verstuurd.
      </p>
    </div>
  );
}

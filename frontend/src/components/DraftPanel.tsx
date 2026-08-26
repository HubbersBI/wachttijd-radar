"use client";

import { useState } from "react";

import type { Wachttijd } from "@/lib/api";
import { buildDraft } from "@/lib/draft";

/**
 * The drafted zorgbemiddeling request.
 *
 * Everything happens in this component. What someone types here is health data about
 * them, so it is held in component state and nowhere else: not sent to the server,
 * not written to localStorage, not kept when the panel closes. Closing it is the
 * retention policy.
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
  const [insurer, setInsurer] = useState("");
  const [copied, setCopied] = useState(false);

  const text = buildDraft({ row, norm, alternative, name, insurer });

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

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
        Uw zorgverzekeraar heeft een zorgplicht. Bij een wachttijd boven de treeknorm
        kunt u kosteloos om zorgbemiddeling vragen. Onderstaande tekst is opgesteld uit
        de cijfers op deze pagina. Wat u hieronder invult blijft in uw browser en wordt
        nergens opgeslagen of verstuurd.
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
            placeholder="optioneel"
            className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
            Zorgverzekeraar
          </span>
          <input
            value={insurer}
            onChange={(event) => setInsurer(event.target.value)}
            autoComplete="off"
            placeholder="optioneel"
            className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
          />
        </label>
      </div>

      <pre className="tabular mt-4 max-h-80 overflow-auto border border-rule bg-paper p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={copy}
          className="border border-ink bg-ink px-4 py-2 text-[13px] text-paper"
        >
          Kopieer de tekst
        </button>
        {copied && <span className="text-[12px] text-ink-dim">Gekopieerd.</span>}
      </div>
    </div>
  );
}

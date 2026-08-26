"use client";

import { useState } from "react";

import { InsurerSelect, SendRequest, TextField } from "@/components/RequestForm";
import type { Wachttijd } from "@/lib/api";
import { buildDraft, draftSubject } from "@/lib/draft";
import { findInsurer } from "@/lib/insurers";

/**
 * A request built from the waiting time this provider reported to the NZa.
 *
 * What someone fills in here is health data about them, so it is held in component
 * state and nowhere else: not sent to our server, not written to localStorage, not
 * kept when the panel closes. Closing it is the retention policy.
 */
export function DraftPanel({
  row,
  norm,
  onClose,
}: {
  row: Wachttijd;
  norm: [number, number];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [insurerName, setInsurerName] = useState("");

  const insurer = findInsurer(insurerName);
  const text = buildDraft({ row, norm, name, insurer: insurerName });
  const ready = name.trim().length > 0 && insurer !== null;

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
        <TextField
          label="Uw naam"
          value={name}
          onChange={setName}
          placeholder="voor- en achternaam"
        />
        <InsurerSelect value={insurerName} onChange={setInsurerName} />
      </div>

      <SendRequest
        text={text}
        subject={draftSubject(row)}
        insurer={insurer}
        ready={ready}
        incomplete="vul uw naam in en kies uw zorgverzekeraar"
      />
    </div>
  );
}

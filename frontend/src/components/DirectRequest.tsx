"use client";

import { useState } from "react";

import { InsurerSelect, SendRequest, TextField } from "@/components/RequestForm";
import type { Treatment } from "@/lib/api";
import { buildAppointmentDraft, daysUntil } from "@/lib/draft";
import { findInsurer } from "@/lib/insurers";

/**
 * The way in for someone who is not comparing anything.
 *
 * Most people who need bemiddeling already have an appointment: they know where they
 * are waiting and how long, and the list is beside the point. Their own appointment
 * is also better evidence for them than a national median, so the request is built
 * from it and attributed to it rather than to the NZa.
 */
export function DirectRequest({ treatments }: { treatments: Treatment[] }) {
  const [open, setOpen] = useState(false);
  const [treatmentKey, setTreatmentKey] = useState("");
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [insurerName, setInsurerName] = useState("");

  const treatment = treatments.find((option) => option.treatment_key === treatmentKey);
  const insurer = findInsurer(insurerName);
  const days = date ? daysUntil(date) : 0;
  const norm = treatment?.norm_days ?? null;

  const complete =
    treatment !== undefined &&
    norm !== null &&
    provider.trim().length > 0 &&
    date.length > 0 &&
    name.trim().length > 0 &&
    insurer !== null;

  const withinNorm = norm !== null && days > 0 && days <= norm[0];
  const ready = complete && days > 0 && !withinNorm;

  const text =
    complete && days > 0 && !withinNorm
      ? buildAppointmentDraft({
          treatment: treatment.treatment,
          norm: norm,
          provider,
          appointmentDate: date,
          name,
          insurer: insurerName,
        })
      : "";

  if (!open) {
    return (
      <section className="mt-10 flex flex-col gap-3 border border-ink px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[14px] leading-relaxed">
          <strong className="font-semibold">Heeft u al een afspraak</strong> en duurt
          het te lang? U kunt uw zorgverzekeraar direct om zorgbemiddeling vragen.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 border border-ink bg-ink px-4 py-2 text-[13px] text-paper"
        >
          Vraag zorgbemiddeling aan
        </button>
      </section>
    );
  }

  return (
    <section className="mt-10 border border-ink bg-paper-hi p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold">Zorgbemiddeling aanvragen</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12px] text-ink-dim underline underline-offset-2"
        >
          sluiten
        </button>
      </div>

      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink-dim">
        Vul in waar u op wacht. Het verzoek wordt opgesteld met de datum van uw eigen
        afspraak en opent in uw e-mailprogramma. Wat u hier invult blijft in uw
        browser en wordt nergens opgeslagen of verstuurd.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
            Behandeling
          </span>
          <select
            value={treatmentKey}
            onChange={(event) => setTreatmentKey(event.target.value)}
            required
            className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
          >
            <option value="">Kies de behandeling</option>
            {treatments.map((option) => (
              <option key={option.treatment_key} value={option.treatment_key}>
                {option.treatment}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Zorgaanbieder"
          value={provider}
          onChange={setProvider}
          placeholder="ziekenhuis of kliniek"
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <TextField
          label="Datum van uw afspraak"
          value={date}
          onChange={setDate}
          type="date"
        />
        <TextField
          label="Uw naam"
          value={name}
          onChange={setName}
          placeholder="voor- en achternaam"
        />
        <InsurerSelect value={insurerName} onChange={setInsurerName} />
      </div>

      {complete && days <= 0 && (
        <p className="mt-4 border-l-2 border-ink pl-4 text-[13px]">
          Die datum ligt niet in de toekomst. Vul de datum in van de afspraak waar u
          nu op wacht.
        </p>
      )}

      {withinNorm && norm && (
        <p className="mt-4 border-l-2 border-ink pl-4 text-[13px] leading-relaxed">
          Deze wachttijd van {days} dagen valt binnen de treeknorm van {norm[0] / 7}{" "}
          weken. Zorgbemiddeling is bedoeld voor wachttijden daarboven. U kunt uw
          verzekeraar natuurlijk altijd bellen als u eerder geholpen wilt worden.
        </p>
      )}

      {text && (
        <SendRequest
          text={text}
          subject={`Verzoek om zorgbemiddeling - ${treatment!.treatment}`}
          insurer={insurer}
          ready={ready}
          incomplete="vul alle velden in"
        />
      )}

      {!text && !withinNorm && (
        <p className="mt-4 text-[12px] text-ink-faint">
          Vul alle velden in om het verzoek te zien.
        </p>
      )}
    </section>
  );
}

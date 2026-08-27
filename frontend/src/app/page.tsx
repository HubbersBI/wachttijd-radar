"use client";

import { useEffect, useMemo, useState } from "react";

import { AssistantDrawer } from "@/components/AssistantDrawer";
import { Controls } from "@/components/Controls";
import { DemoBadge, DemoNotice } from "@/components/DemoNotice";
import { DirectRequest } from "@/components/DirectRequest";
import { Scale } from "@/components/Scale";
import { WaitRow } from "@/components/WaitRow";
import type { Health, Treatment, WachttijdenResponse } from "@/lib/api";
import { getHealth, getTreatments, getWachttijden } from "@/lib/api";
import { formatDate, normLabel } from "@/lib/format";

export default function Page() {
  const [health, setHealth] = useState<Health | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [treatmentKey, setTreatmentKey] = useState("");
  const [city, setCity] = useState("");
  const [data, setData] = useState<WachttijdenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError("De gegevens zijn niet bereikbaar."));
    getTreatments().then(setTreatments).catch(() => setError("De gegevens zijn niet bereikbaar."));
  }, []);

  useEffect(() => {
    if (!treatmentKey) {
      setData(null);
      return;
    }
    setCity("");
    getWachttijden(treatmentKey)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError("Deze behandeling kon niet worden opgehaald."));
  }, [treatmentKey]);

  const cities = useMemo(() => {
    const names = new Set((data?.results ?? []).map((row) => row.city).filter(Boolean));
    return [...names].sort() as string[];
  }, [data]);

  const rows = useMemo(
    () => (data?.results ?? []).filter((row) => !city || row.city === city),
    [data, city],
  );

  const measured = rows.filter((row) => row.days !== null);
  const longest = measured.length ? Math.max(...measured.map((row) => row.days!)) : 0;
  const shortest = measured.length ? Math.min(...measured.map((row) => row.days!)) : 0;

  // The scale always reaches the norm, so the marker is on screen even when every
  // location in view is comfortably inside it.
  const norm = data?.norm_days ?? null;
  const scaleMax = Math.max(longest, norm ? norm[1] : 0);
  const over = rows.filter((row) => row.norm_verdict === "exceeded").length;
  const ambiguous = rows.filter((row) => row.norm_verdict === "depends").length;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 pb-24">
      <DemoNotice />

      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink py-4">
        <span className="text-[13px] font-semibold tracking-[0.2em] uppercase">
          Wachttijd-radar
        </span>
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <DemoBadge />
          {health?.fetched_at && (
            <span className="tabular text-[11px] text-ink-dim">
              Bron: Nederlandse Zorgautoriteit &middot; opgehaald {formatDate(health.fetched_at)}
            </span>
          )}
        </span>
      </header>

      <section className="pt-10 pb-6">
        <h1 className="max-w-3xl text-[clamp(1.6rem,3.2vw,2.3rem)] leading-[1.12] font-semibold tracking-[-0.02em]">
          Wachttijden in de medisch-specialistische zorg, per behandeling en per locatie
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-dim">
          Ziekenhuizen en klinieken melden hun wachttijden aan de Nederlandse
          Zorgautoriteit. Hier staat wat zij hebben gemeld, met de datum erbij, en of
          dat binnen de treeknorm valt &mdash; de termijn waarbinnen uw zorgverzekeraar
          u moet kunnen helpen.
        </p>

      </section>

      <DirectRequest treatments={treatments} />

      <section className="mt-10 border-t border-ink pt-6">
        <p className="mb-4 text-[13px] text-ink-dim">
          Of zoek eerst op waar de wachttijd voor uw behandeling het kortst is.
        </p>
        <Controls
          treatments={treatments}
          treatmentKey={treatmentKey}
          city={city}
          cities={cities}
          onTreatmentChange={setTreatmentKey}
          onCityChange={setCity}
        />
      </section>

      {error && (
        <p className="mt-10 border-l-2 border-ink pl-4 text-[15px]">
          {error} Probeer het later opnieuw.
        </p>
      )}

      {!treatmentKey && !error && (
        <p className="mt-16 max-w-md text-[15px] text-ink-dim">
          Kies hierboven een behandeling om de wachttijden per locatie te vergelijken.
        </p>
      )}

      {data && rows.length > 0 && (
        <section className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{data.treatment}</h2>
            <span className="tabular text-[11px] tracking-[0.1em] text-ink-dim uppercase">
              {data.treatment_type}
            </span>
          </div>

          <p className="tabular mt-2 text-[13px] text-ink-dim">
            {rows.length} {rows.length === 1 ? "locatie" : "locaties"}
            {city ? ` in ${city}` : " in Nederland"}
            {measured.length > 0 && ` · ${shortest} tot ${longest} dagen`}
          </p>

          {norm && over > 0 && (
            <p className="mt-4 max-w-2xl border-l-2 border-ink pl-4 text-[15px] leading-relaxed">
              <strong className="font-semibold">
                {over} van de {rows.length} {rows.length === 1 ? "locatie" : "locaties"}
                {over === 1 ? " zit" : " zitten"} boven de treeknorm
              </strong>{" "}
              van {normLabel(norm)}. Bij een wachttijd boven de treeknorm kunt u uw
              zorgverzekeraar om zorgbemiddeling vragen. Dat is kosteloos.
              {ambiguous > 0 &&
                ` Nog ${ambiguous} ${ambiguous === 1 ? "locatie valt" : "locaties vallen"} in de marge tussen 6 en 7 weken: de bron meldt niet of de behandeling poliklinisch of klinisch is.`}
            </p>
          )}

          <div className="mt-10">
            <Scale longest={scaleMax} norm={norm} />
            <ol className="mt-2">
              {rows.map((row) => (
                <WaitRow
                  key={row.location_key}
                  row={row}
                  longest={scaleMax}
                  norm={norm}
                  showCity={!city}
                />
              ))}
            </ol>
          </div>

          <footer className="mt-10 border-t border-ink pt-4 text-[12px] leading-relaxed text-ink-dim">
            <p className="max-w-2xl">
              Elke wachttijd is een mediaan in dagen, zoals de zorgaanbieder die zelf
              heeft gemeld op de datum bij de regel. Een locatie zonder cijfer had te
              weinig waarnemingen om een betrouwbare wachttijd te melden. De gegevens
              worden tweewekelijks bijgewerkt.
            </p>
          </footer>
        </section>
      )}

      {data && rows.length === 0 && (
        <p className="mt-14 text-[15px] text-ink-dim">
          Geen locaties gevonden voor deze behandeling in {city}.
        </p>
      )}
      <AssistantDrawer treatments={treatments} />
    </div>
  );
}

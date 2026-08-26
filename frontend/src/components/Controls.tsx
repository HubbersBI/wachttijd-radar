"use client";

import type { Treatment } from "@/lib/api";

/**
 * The two controls. Treatment is chosen by key, never by name - four keys carry more
 * than one name, and grouping by name would hide providers from the comparison.
 */
export function Controls({
  treatments,
  treatmentKey,
  city,
  cities,
  onTreatmentChange,
  onCityChange,
}: {
  treatments: Treatment[];
  treatmentKey: string;
  city: string;
  cities: string[];
  onTreatmentChange: (key: string) => void;
  onCityChange: (city: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <label className="flex-1">
        <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
          Behandeling
        </span>
        <select
          value={treatmentKey}
          onChange={(event) => onTreatmentChange(event.target.value)}
          className="w-full border border-ink bg-paper-hi px-3 py-2.5 text-[15px]"
        >
          <option value="">Kies een behandeling</option>
          {treatments.map((treatment) => (
            <option key={treatment.treatment_key} value={treatment.treatment_key}>
              {treatment.treatment}
            </option>
          ))}
        </select>
      </label>

      <label className="sm:w-64">
        <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
          Plaats
        </span>
        <select
          value={city}
          onChange={(event) => onCityChange(event.target.value)}
          disabled={!treatmentKey}
          className="w-full border border-ink bg-paper-hi px-3 py-2.5 text-[15px] disabled:border-rule-hi disabled:text-ink-faint"
        >
          <option value="">Heel Nederland</option>
          {cities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

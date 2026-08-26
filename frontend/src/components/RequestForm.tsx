"use client";

import { byConcern, emailFor, type Insurer } from "@/lib/insurers";

/** The insurer dropdown, grouped by the concern whose desk handles the bemiddeling. */
export function InsurerSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
        Uw zorgverzekeraar
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
}) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-[11px] tracking-[0.14em] text-ink-dim uppercase">
        {label}
      </span>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        required
        placeholder={placeholder}
        className="w-full border border-rule-hi bg-paper px-3 py-2 text-[14px]"
      />
    </label>
  );
}

/**
 * The letter, and the way out of the browser.
 *
 * Shared by both request paths so they cannot drift apart. The request leaves through
 * the person's own mail client: it travels from their mailbox to their insurer and
 * never passes through our server, so nothing here is logged, stored or sent by us.
 */
export function SendRequest({
  text,
  subject,
  insurer,
  ready,
  incomplete,
}: {
  text: string;
  subject: string;
  insurer: Insurer | null;
  ready: boolean;
  incomplete: string;
}) {
  const mailto = insurer
    ? `mailto:${emailFor(insurer)}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(text)}`
    : "";

  return (
    <>
      <pre className="tabular mt-4 max-h-80 overflow-auto border border-rule bg-paper p-3 text-[12px] leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {ready && insurer ? (
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
          {ready && insurer ? `wordt geadresseerd aan ${emailFor(insurer)}` : incomplete}
        </span>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
        Dit is een demonstratie. De adressen eindigen op .invalid en bestaan niet, dus
        er wordt niets naar een echte zorgverzekeraar verstuurd.
      </p>
    </>
  );
}

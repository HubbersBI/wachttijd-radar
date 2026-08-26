"use client";

import { useEffect, useState } from "react";

import { Assistant } from "@/components/Assistant";
import type { Treatment } from "@/lib/api";

/**
 * The assistant, kept out of the way until it is wanted.
 *
 * A panel that slides in from the right rather than a block in the page: asking a
 * question is one of two ways in, and the other one - the list - should not have to
 * scroll past it. The page stays usable behind the panel, so this is not a modal and
 * does not trap focus; Escape closes it.
 *
 * The slide is a transform, which `prefers-reduced-motion` in globals.css reduces to
 * nothing for anyone who asked for that.
 */
export function AssistantDrawer({ treatments }: { treatments: Treatment[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // The question is the only reason to open this, so put the caret in it.
    document.getElementById("vraag")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-controls="zoekhulp"
        className="fixed right-0 bottom-6 z-40 border border-ink border-r-0 bg-ink px-4 py-3 text-[13px] text-paper"
      >
        {open ? "Sluit zoekhulp" : "Stel een vraag"}
      </button>

      <aside
        id="zoekhulp"
        role="dialog"
        aria-label="Zoekhulp"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-30 w-full overflow-x-hidden overflow-y-auto border-l border-ink bg-paper transition-transform duration-300 ease-out sm:w-[38rem] ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-ink px-5 py-4">
          <h2 className="text-[13px] font-semibold tracking-[0.2em] uppercase">Zoekhulp</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[12px] text-ink-dim underline underline-offset-2"
          >
            sluiten
          </button>
        </div>

        <div className="px-5 pt-1 pb-24">
          <Assistant treatments={treatments} />
        </div>
      </aside>
    </>
  );
}

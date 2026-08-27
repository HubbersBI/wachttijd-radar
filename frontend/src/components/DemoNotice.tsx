"use client";

import { useEffect, useRef, useState } from "react";

/** Remembers that this browser has read the notice. Not health data, not personal -
 *  a single flag saying the dialog has been seen. */
const SEEN = "wachttijd-radar:demo-notice-seen";

export const ZORGKAART = "https://www.zorgkaartnederland.nl/wachttijden";
export const NZA = "https://zorgbeeld.nza.nl";

/**
 * What this site is, said before anything else.
 *
 * The figures on the page are real - they come from the NZa - but the site is a
 * portfolio build, not a service anyone maintains. Someone arriving from a search
 * result rather than from a portfolio has no way to know that, and a waiting time is
 * exactly the kind of figure people act on. So it is said plainly, once, up front,
 * with the route to the service that is maintained.
 *
 * Unlike the assistant drawer, this *is* a modal and does trap focus: it is the one
 * thing on the page that should be read before the page is used. Escape and the
 * button both dismiss it, and it stays dismissed for this browser.
 */
export function DemoNotice() {
  // Closed on the server and on first paint, so the markup cannot flash the dialog at
  // someone who dismissed it three visits ago.
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN)) setOpen(true);
    } catch {
      // Private mode, or storage blocked. Showing the notice every visit is the safe
      // way to be wrong.
      setOpen(true);
    }
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(SEEN, "1");
    } catch {
      // Nothing to do: it will be shown again next visit, which is harmless.
    }
  }

  useEffect(() => {
    if (!open) return;
    confirm.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismiss();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      // Keep Tab inside the dialog. Without this the focus ring wanders into the page
      // behind, where a screen-reader user would have no idea a dialog is open.
      const focusable = dialog.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 py-8">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-notice-title"
        className="max-h-full w-full max-w-lg overflow-y-auto border border-ink bg-paper px-6 py-6"
      >
        <p className="tabular text-[11px] tracking-[0.2em] text-ink-dim uppercase">
          Portfolio-demo &middot; J. Hubbers &middot; augustus 2026
        </p>
        <h2
          id="demo-notice-title"
          className="mt-2 text-[20px] leading-tight font-semibold tracking-[-0.01em]"
        >
          Dit is een demonstratie, geen zorgdienst
        </h2>

        <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-dim">
          <p>
            Wachttijd-radar is gebouwd als portfolioproject. De cijfers komen echt van
            de{" "}
            <a
              href={NZA}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2"
            >
              Nederlandse Zorgautoriteit
            </a>
            , maar deze site wordt niet onderhouden als dienst en is niet bedoeld om
            beslissingen over uw zorg op te baseren.
          </p>
          <p>
            Zoekt u een actuele wachttijd om echt iets mee te doen, gebruik dan{" "}
            <a
              href={ZORGKAART}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2"
            >
              de wachttijden-assistent van ZorgkaartNederland
            </a>{" "}
            of neem contact op met uw zorgverzekeraar of huisarts.
          </p>
          <p>
            Deze site geeft geen medisch advies en stelt geen diagnose. Er worden geen
            gegevens over u opgeslagen of verstuurd.
          </p>
        </div>

        <button
          ref={confirm}
          type="button"
          onClick={dismiss}
          className="mt-6 w-full border border-ink bg-ink px-4 py-2.5 text-[14px] text-paper"
        >
          Ik begrijp het
        </button>
      </div>
    </div>
  );
}

/**
 * The same fact, kept on the page after the dialog is gone.
 *
 * Someone who dismissed the dialog on a previous visit, or who was sent a deep link,
 * still has to be able to see what they are looking at.
 */
export function DemoBadge() {
  return (
    <span className="tabular text-[11px] text-ink-dim">
      <span className="border border-rule-hi px-1.5 py-0.5">Portfolio-demo</span>{" "}
      <span className="text-ink-faint">door J. Hubbers &middot; augustus 2026 &middot;</span>{" "}
      <a
        href={ZORGKAART}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2"
      >
        echte wachttijden
      </a>
    </span>
  );
}

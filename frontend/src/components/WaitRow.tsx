"use client";

import { useState } from "react";

import { DraftPanel } from "@/components/DraftPanel";
import { NormRule, WaitBar } from "@/components/WaitBar";
import type { Wachttijd } from "@/lib/api";
import { formatDate, formatWait, scalePosition } from "@/lib/format";

// Kept short so the label cannot run off the track on a narrow screen. The striped
// segment and the summary above the list carry the detail of what "op de grens" means.
const VERDICT_TEXT: Record<string, string> = {
  within: "binnen de treeknorm",
  depends: "op de grens",
  exceeded: "boven de treeknorm",
};

/**
 * One provider on the shared scale.
 *
 * The bar track is the same width as the axis above it, so a bar and a tick at the
 * same value line up, and the norm rule falls in the same place on every row.
 *
 * A row with insufficient observations keeps its place and says so. It is never
 * dropped and never drawn as a wait of zero.
 */
export function WaitRow({
  row,
  longest,
  norm,
  showCity = true,
}: {
  row: Wachttijd;
  /** The scale maximum, which is at least the norm so the rule is always visible. */
  longest: number;
  norm?: [number, number] | null;
  /** Hidden when the list is already filtered to one city - it would repeat every row. */
  showCity?: boolean;
}) {
  const [drafting, setDrafting] = useState(false);
  const unknown = row.days === null;
  const verdict = row.norm_verdict ? VERDICT_TEXT[row.norm_verdict] : null;
  const labelLeft = unknown ? "9%" : scalePosition(row.days!, longest);
  // Long bars would push their label off the right edge, so it sits inside instead.
  const insideBar = !unknown && row.days! / longest > 0.72;
  const insideGround = row.norm_verdict === "exceeded" ? "bg-over" : "bg-within";
  // Only where the bar reaches the norm. See NormRule.
  const showRule = row.norm_verdict === "exceeded" || row.norm_verdict === "depends";
  // Offered wherever the wait passes the stricter norm. Whether it is over the 6-week
  // or the 7-week reading is the insurer's to determine - the person is asking, not
  // adjudicating, and the draft states the facts either way.
  const canRequest = showRule && norm && row.days !== null;

  return (
    <li className="border-t border-rule py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="truncate text-[14px] leading-tight font-medium">{row.location}</h3>
        <span className="tabular flex shrink-0 items-baseline gap-3 text-[11px] text-ink-faint">
          <span>
            {showCity && `${row.city} \u00b7 `}gemeld {formatDate(row.supplied_at)}
          </span>
          {canRequest && (
            <button
              type="button"
              onClick={() => setDrafting((open) => !open)}
              className="shrink-0 text-ink underline underline-offset-2"
            >
              {drafting ? "verberg verzoek" : "zorgbemiddeling"}
            </button>
          )}
        </span>
      </div>

      <div className="relative mt-2 h-4">
        {norm && showRule && <NormRule norm={norm} scaleMax={longest} />}

        {unknown ? (
          <div className="hatch absolute inset-y-0 left-0 w-[9%] border border-rule-hi" />
        ) : (
          <WaitBar days={row.days!} scaleMax={longest} norm={norm ?? null} />
        )}

        <span
          className={`tabular absolute top-1/2 z-20 flex h-4 -translate-y-1/2 items-baseline gap-2 px-2 text-[12px] leading-4 whitespace-nowrap ${
            insideBar ? `${insideGround} text-paper` : "bg-paper text-ink"
          }`}
          style={insideBar ? { right: `calc(100% - ${labelLeft})` } : { left: labelLeft }}
        >
          {unknown ? (
            <span className="text-ink-faint">onvoldoende waarnemingen</span>
          ) : (
            <>
              <span>{formatWait(row.days!)}</span>
              {verdict && (
                <span
                  className={
                    insideBar
                      ? "text-[11px] text-paper/80"
                      : row.norm_verdict === "exceeded"
                        ? "text-[11px] text-over"
                        : row.norm_verdict === "within"
                          ? "text-[11px] text-within"
                          : "text-[11px] text-ink-dim"
                  }
                >
                  {verdict}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {drafting && canRequest && (
        <DraftPanel
          row={row}
          norm={norm!}
          onClose={() => setDrafting(false)}
        />
      )}
    </li>
  );
}

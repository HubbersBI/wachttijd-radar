import { Sparkline } from "@/components/Sparkline";
import type { Wachttijd } from "@/lib/api";
import { barWidth, formatDate, formatTrend, formatWait, trend } from "@/lib/format";

/**
 * One provider on the shared scale.
 *
 * The bar track spans exactly the same width as the axis above it, so a bar and a
 * tick at the same value line up. The figure rides the tip of its own bar rather
 * than sitting in a column of its own - the number and its length are one thing.
 *
 * A row with insufficient observations keeps its place and says so. It is never
 * dropped and never drawn as a wait of zero.
 */
export function WaitRow({
  row,
  longest,
  showCity = true,
}: {
  row: Wachttijd;
  longest: number;
  /** Hidden when the list is already filtered to one city - it would repeat every row. */
  showCity?: boolean;
}) {
  const unknown = row.days === null;
  const width = unknown ? "0%" : barWidth(row.days!, longest);
  const insideBar = !unknown && row.days! / longest > 0.62;
  // No trend beside a row with no current figure. The earlier reports are real, but
  // a change shown next to "onvoldoende waarnemingen" reads as movement we cannot
  // claim: we do not know what the wait is now. The history stays in the API.
  const change = unknown ? null : trend(row.history);
  const reports = row.history.length;

  return (
    <li className="border-t border-rule py-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="truncate text-[14px] leading-tight font-medium">{row.location}</h3>
        <span className="tabular flex shrink-0 items-center gap-2 text-[11px] text-ink-faint">
          {change !== null && (
            <>
              {/* Neutral in both directions: blue is the measured length, and
                  overloading it with "getting worse" would spend the one accent twice.
                  The sign carries the direction. */}
              <span
                className="text-ink-dim"
                title={`${formatTrend(change)} sinds ${formatDate(row.history[0].supplied_at)}, over ${reports} meldingen`}
              >
                {formatTrend(change)}
              </span>
              <span className="text-ink-faint">
                <Sparkline history={row.history} />
              </span>
            </>
          )}
          <span>
            {showCity && `${row.city} · `}gemeld {formatDate(row.supplied_at)}
          </span>
        </span>
      </div>

      <div className="relative mt-1.5 h-[18px]">
        {unknown ? (
          <>
            <div className="hatch absolute inset-y-0 left-0 w-[9%] border border-rule-hi" />
            <span className="tabular absolute top-1/2 left-[9%] -translate-y-1/2 pl-2 text-[12px] text-ink-faint">
              onvoldoende waarnemingen
            </span>
          </>
        ) : (
          <>
            <div
              className="absolute inset-y-0 left-0 bg-measure transition-[width] duration-500 ease-out"
              style={{ width }}
            />
            <span
              className={`tabular absolute top-1/2 -translate-y-1/2 text-[12px] transition-[left,right] duration-500 ease-out ${
                insideBar ? "pr-2 text-paper" : "pl-2 text-ink"
              }`}
              style={insideBar ? { right: `calc(100% - ${width})` } : { left: width }}
            >
              {formatWait(row.days!)}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

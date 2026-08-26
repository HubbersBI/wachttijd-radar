import { Sparkline } from "@/components/Sparkline";
import type { Wachttijd } from "@/lib/api";
import { barWidth, formatDate, formatTrend, formatWait, trend } from "@/lib/format";

/**
 * One provider, laid out on the shared row grid: the measurement on the left, the
 * trend in a fixed column on the right.
 *
 * The bar track is the same grid column as the axis above it, so a bar and a tick at
 * the same value line up. The figure rides the tip of its own bar.
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
  const measuredFrom = row.history.find((point) => point.days !== null);

  return (
    <li className="row-grid border-t border-rule py-3">
      <div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h3 className="text-[14px] leading-tight font-medium sm:truncate">{row.location}</h3>
          <span className="tabular text-[11px] text-ink-faint sm:shrink-0">
            {showCity && `${row.city} \u00b7 `}gemeld {formatDate(row.supplied_at)}
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
      </div>

      {/* Fixed column, so the trend sits in the same place on every row instead of
          drifting with the length of the provider's name. */}
      <div className="flex items-center gap-2 text-left sm:block sm:pt-0.5 sm:text-right">
        {change !== null && measuredFrom && (
          <>
            <span className="block text-ink-dim">
              <Sparkline history={row.history} />
            </span>
            <span className="tabular block text-[12px] text-ink-dim sm:mt-0.5">
              {formatTrend(change)}
            </span>
            {/* A change means nothing without the period it was measured over. */}
            <span className="tabular block text-[10px] leading-tight text-ink-faint">
              sinds {formatDate(measuredFrom.supplied_at)}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

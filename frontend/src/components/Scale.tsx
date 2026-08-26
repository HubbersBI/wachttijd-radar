import { axisTicks } from "@/lib/format";

/**
 * The shared measuring axis. Drawn once, above the list, so every provider's bar is
 * read against the same ruler rather than against its own row.
 *
 * The treeknorm becomes a marked position on this axis once the norm mapping in
 * NOTES.md is settled - the scale is built to receive it.
 */
export function Scale({ longest }: { longest: number }) {
  const ticks = axisTicks(longest);

  return (
    <div className="relative select-none pt-1" aria-hidden="true">
      <div className="relative h-3">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute top-0 h-3 w-px bg-rule-hi"
            style={{ left: `${(tick / longest) * 100}%` }}
          />
        ))}
        <span className="absolute inset-x-0 bottom-0 h-px bg-rule-hi" />
      </div>
      <div className="relative mt-1 h-4">
        {ticks.map((tick) => (
          <span
            key={tick}
            className="tabular absolute top-0 text-[11px] text-ink-faint"
            style={{
              left: `${(tick / longest) * 100}%`,
              transform: tick === 0 ? "none" : "translateX(-50%)",
            }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

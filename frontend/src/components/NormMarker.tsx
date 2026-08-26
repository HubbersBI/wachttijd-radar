import { normLabel, scalePosition } from "@/lib/format";

/**
 * The treeknorm, marked on the same scale as the bars.
 *
 * This is the point of the app: not the number, but which side of the line it falls
 * on. Everything past this marker is a wait the insurer has a zorgplicht to act on.
 *
 * A behandeling gets a band rather than a line, because the norm is 6 weeks if the
 * treatment is poliklinisch and 7 if it is klinisch, and the source does not say
 * which. The band is the honest width of that uncertainty.
 *
 * Rendered inside each row's bar track rather than across the whole list, so it never
 * crosses a provider's name. Every track shares one scale, so the segments line up
 * into a single line down the page.
 */
export function NormBand({ norm, scaleMax }: { norm: [number, number]; scaleMax: number }) {
  const [strict, lenient] = norm;
  const left = scalePosition(strict, scaleMax);
  const width =
    strict === lenient ? "2px" : `calc(${scalePosition(lenient, scaleMax)} - ${left})`;

  return (
    <div
      className="hatch pointer-events-none absolute inset-y-0 z-10 border-x border-ink/50"
      style={{ left, width }}
      aria-hidden="true"
    />
  );
}

/** The label above the axis, naming what the band is. */
export function NormLabel({ norm, scaleMax }: { norm: [number, number]; scaleMax: number }) {
  return (
    <span
      className="tabular absolute bottom-0 pl-1.5 text-[10px] whitespace-nowrap text-ink-dim"
      style={{ left: scalePosition(norm[0], scaleMax) }}
    >
      treeknorm {normLabel(norm)}
    </span>
  );
}

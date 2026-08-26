import { scalePosition } from "@/lib/format";

/**
 * One wait, drawn against the treeknorm.
 *
 * The bar changes where the norm falls, so being over it is visible as excess rather
 * than as a marker laid on top of a bar. Three segments, in the order a wait grows:
 *
 *   green     0 to the strict norm        the part that is within under any reading
 *   striped   strict norm to lenient norm the part the source cannot place
 *   red       past the lenient norm       the part that is over under any reading
 *
 * A polikliniekbezoek has one norm rather than a range, so its striped segment has
 * zero width and the bar simply turns red at 4 weeks.
 *
 * Without a norm there is no verdict to carry, so the bar is plain indigo instead.
 */
export function WaitBar({
  days,
  scaleMax,
  norm,
}: {
  days: number;
  scaleMax: number;
  norm: [number, number] | null;
}) {
  if (!norm) {
    return (
      <div
        className="absolute inset-y-0 left-0 bg-measure"
        style={{ width: scalePosition(days, scaleMax) }}
      />
    );
  }

  const [strict, lenient] = norm;
  const within = Math.min(days, strict);
  const uncertain = Math.max(0, Math.min(days, lenient) - strict);
  const over = Math.max(0, days - lenient);

  return (
    <>
      <div
        className="absolute inset-y-0 left-0 bg-within"
        style={{ width: scalePosition(Math.max(within, scaleMax * 0.004), scaleMax) }}
      />
      {uncertain > 0 && (
        <div
          className="hatch-uncertain absolute inset-y-0"
          style={{
            left: scalePosition(strict, scaleMax),
            width: scalePosition(uncertain, scaleMax),
          }}
        />
      )}
      {over > 0 && (
        <div
          className="absolute inset-y-0 bg-over"
          style={{
            left: scalePosition(lenient, scaleMax),
            width: scalePosition(over, scaleMax),
          }}
        />
      )}
    </>
  );
}

/**
 * The treeknorm itself, as a rule through the track.
 *
 * Drawn only where the bar actually reaches the norm. On a wait comfortably inside it
 * the rule floats in empty track with nothing touching it and reads as a stray mark,
 * and "binnen de treeknorm" on the row already says what it needs to.
 *
 * Taller than the track so it stays visible where a label sits over it.
 */
export function NormRule({ norm, scaleMax }: { norm: [number, number]; scaleMax: number }) {
  return (
    <div
      className="pointer-events-none absolute -inset-y-1.5 z-10 w-0.5 bg-ink"
      style={{ left: scalePosition(norm[0], scaleMax) }}
      aria-hidden="true"
    />
  );
}

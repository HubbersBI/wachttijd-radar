import { measuredHistory } from "@/lib/format";
import type { HistoryPoint } from "@/lib/api";

/**
 * The run of reports behind one figure.
 *
 * Drawn only when at least two reports carry a number. A single report is a point,
 * not a trend, and a line through one point would invent movement that was never
 * observed. Reports with insufficient observations are simply absent from the line -
 * they are gaps in the record, not zeroes.
 */
export function Sparkline({
  history,
  width = 56,
  height = 16,
}: {
  history: HistoryPoint[];
  width?: number;
  height?: number;
}) {
  const values = measuredHistory(history);
  if (values.length < 2) return null;

  const high = Math.max(...values);
  const low = Math.min(...values);
  const span = high - low || 1;
  const step = width / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - low) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

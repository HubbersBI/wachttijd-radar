import { describe, expect, it } from "vitest";

import { axisTicks, barWidth, formatDate, formatTrend, formatWait, trend } from "@/lib/format";

describe("formatDate", () => {
  it("renders the reported date in Dutch", () => {
    expect(formatDate("2026-08-18T08:00:00.000Z")).toBe("18 aug 2026");
  });
});

describe("formatWait", () => {
  it("names a zero wait rather than printing a bare 0", () => {
    expect(formatWait(0)).toBe("geen wachttijd");
  });

  it("uses the singular for one day", () => {
    expect(formatWait(1)).toBe("1 dag");
  });

  it("reports days, the unit the source uses", () => {
    expect(formatWait(256)).toBe("256 dagen");
  });
});

describe("barWidth", () => {
  it("scales against the longest wait in the list", () => {
    expect(barWidth(128, 256)).toBe("50%");
  });

  it("keeps a short wait visible instead of collapsing it to nothing", () => {
    expect(parseFloat(barWidth(0, 256))).toBeGreaterThan(0);
  });
});

describe("axisTicks", () => {
  it("produces round ticks that span the range", () => {
    const ticks = axisTicks(256);
    expect(ticks[0]).toBe(0);
    expect(ticks).toEqual([0, 60, 120, 180, 240]);
  });

  it("survives a list where nothing has a measured wait", () => {
    expect(axisTicks(0)).toEqual([0]);
  });
});

describe("trend", () => {
  const point = (days: number | null, supplied_at: string) => ({
    days,
    insufficient_observations: days === null,
    supplied_at,
  });

  it("measures from the first report to the last", () => {
    expect(trend([point(90, "a"), point(120, "b"), point(256, "c")])).toBe(166);
  });

  it("is null for a single report, which is a point and not a trend", () => {
    expect(trend([point(90, "a")])).toBeNull();
  });

  it("is null when only one report carries a number", () => {
    expect(trend([point(null, "a"), point(90, "b")])).toBeNull();
  });

  it("skips reports without a number rather than treating them as zero", () => {
    expect(trend([point(90, "a"), point(null, "b"), point(70, "c")])).toBe(-20);
  });
});

describe("formatTrend", () => {
  it("always shows the direction", () => {
    expect(formatTrend(166)).toBe("+166 dagen");
    expect(formatTrend(-22)).toBe("\u221222 dagen");
  });
});

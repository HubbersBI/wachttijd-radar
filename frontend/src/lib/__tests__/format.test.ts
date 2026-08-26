import { describe, expect, it } from "vitest";

import { axisTicks, barWidth, formatDate, formatWait } from "@/lib/format";

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

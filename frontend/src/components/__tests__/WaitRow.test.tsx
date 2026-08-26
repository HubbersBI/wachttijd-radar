import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WaitRow } from "@/components/WaitRow";
import type { Wachttijd } from "@/lib/api";

const base: Wachttijd = {
  location_key: "abc",
  care_provider: "Diakonessenhuis",
  location: "Diakonessenhuis Utrecht",
  postal_code: "3582KE",
  city: "Utrecht",
  treatment_key: "def",
  treatment: "Initiele totale knie vervanging (orthopedie)",
  treatment_type: "Behandeling",
  specialism: "Orthopedie (305)",
  days: 68,
  insufficient_observations: false,
  supplied_at: "2026-08-18T08:00:00.000Z",
  fetched_at: "2026-08-26T09:00:00+00:00",
  history: [
    { days: 90, insufficient_observations: false, supplied_at: "2026-07-07T08:00:00.000Z" },
    { days: 68, insufficient_observations: false, supplied_at: "2026-08-18T08:00:00.000Z" },
  ],
};

describe("WaitRow", () => {
  it("shows the wait with the date it was reported", () => {
    render(<WaitRow row={base} longest={256} />);
    expect(screen.getByText("68 dagen")).toBeInTheDocument();
    expect(screen.getByText(/gemeld 18 aug 2026/)).toBeInTheDocument();
  });

  it("says so when there is no trustworthy number, instead of showing one", () => {
    const unknown = { ...base, days: null, insufficient_observations: true };
    render(<WaitRow row={unknown} longest={256} />);
    expect(screen.getByText("onvoldoende waarnemingen")).toBeInTheDocument();
    expect(screen.queryByText(/dagen/)).not.toBeInTheDocument();
    expect(screen.queryByText(/geen wachttijd/)).not.toBeInTheDocument();
  });

  it("keeps the reported date on a row that has no number", () => {
    const unknown = { ...base, days: null, insufficient_observations: true };
    render(<WaitRow row={unknown} longest={256} />);
    expect(screen.getByText(/gemeld 18 aug 2026/)).toBeInTheDocument();
  });

  it("drops the city when the list is already filtered to one", () => {
    render(<WaitRow row={base} longest={256} showCity={false} />);
    expect(screen.queryByText(/Utrecht ·/)).not.toBeInTheDocument();
  });
});

describe("WaitRow trend", () => {
  it("shows the change across the reported run", () => {
    render(<WaitRow row={base} longest={256} />);
    expect(screen.getByText("−22 dagen")).toBeInTheDocument();
  });

  it("shows no trend when there is only one report", () => {
    const single = { ...base, history: [base.history[1]] };
    render(<WaitRow row={single} longest={256} />);
    expect(screen.queryByText(/dagen sinds/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^[+−]\d+ dagen$/)).not.toBeInTheDocument();
  });

  it("does not invent a trend from reports that carry no number", () => {
    const gaps = {
      ...base,
      history: [
        { days: null, insufficient_observations: true, supplied_at: "2026-07-07T08:00:00.000Z" },
        { days: 68, insufficient_observations: false, supplied_at: "2026-08-18T08:00:00.000Z" },
      ],
    };
    render(<WaitRow row={gaps} longest={256} />);
    expect(screen.queryByText(/^[+−]\d+ dagen$/)).not.toBeInTheDocument();
  });
});

describe("WaitRow trend and missing figures", () => {
  it("shows no trend when the current report has no number", () => {
    const unknownNow = {
      ...base,
      days: null,
      insufficient_observations: true,
      history: [
        { days: 90, insufficient_observations: false, supplied_at: "2026-07-07T08:00:00.000Z" },
        { days: null, insufficient_observations: true, supplied_at: "2026-08-18T08:00:00.000Z" },
      ],
    };
    render(<WaitRow row={unknownNow} longest={256} />);
    expect(screen.getByText("onvoldoende waarnemingen")).toBeInTheDocument();
    expect(screen.queryByText(/dagen/)).not.toBeInTheDocument();
  });
});

describe("WaitRow trend context", () => {
  it("names the period the change was measured over", () => {
    render(<WaitRow row={base} longest={256} />);
    expect(screen.getByText("\u221222 dagen")).toBeInTheDocument();
    expect(screen.getByText("sinds 7 jul 2026")).toBeInTheDocument();
  });

  it("dates the period from the first report that carried a number", () => {
    const leadingGap = {
      ...base,
      history: [
        { days: null, insufficient_observations: true, supplied_at: "2026-06-01T08:00:00.000Z" },
        { days: 90, insufficient_observations: false, supplied_at: "2026-07-07T08:00:00.000Z" },
        { days: 68, insufficient_observations: false, supplied_at: "2026-08-18T08:00:00.000Z" },
      ],
    };
    render(<WaitRow row={leadingGap} longest={256} />);
    expect(screen.getByText("sinds 7 jul 2026")).toBeInTheDocument();
    expect(screen.queryByText("sinds 1 jun 2026")).not.toBeInTheDocument();
  });
});

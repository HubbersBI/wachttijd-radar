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

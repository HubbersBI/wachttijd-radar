import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Assistant } from "@/components/Assistant";
import type { AssistantReply, Treatment } from "@/lib/api";

const treatments: Treatment[] = [
  {
    treatment_key: "mri-heup",
    treatment: "MRI heup(en)/ onderste extremiteit(en).",
    specialism: "Radiologie (362)",
    treatment_type: "Diagnostiek",
    location_count: 118,
    norm_days: [28, 28],
  },
];

const row = {
  location_key: "a",
  care_provider: "BovenIJ",
  location: "Stichting BovenIJ",
  postal_code: "1034CS",
  city: "Amsterdam",
  treatment_key: "mri-heup",
  treatment: "MRI heup(en)/ onderste extremiteit(en).",
  treatment_type: "Diagnostiek",
  specialism: "Radiologie (362)",
  days: 8,
  insufficient_observations: false,
  supplied_at: "2026-08-18T08:00:00.000Z",
  fetched_at: "2026-08-26T09:00:00+00:00",
  norm_days: [28, 28] as [number, number],
  norm_verdict: "within" as const,
};

function reply(over: Partial<AssistantReply> = {}): AssistantReply {
  return {
    understood: {
      treatment_key: "mri-heup",
      city: "Amsterdam",
      max_days: 28,
      within_norm: false,
      read_by: "groq",
    },
    answer: {
      treatment_key: "mri-heup",
      treatment: "MRI heup(en)/ onderste extremiteit(en).",
      treatment_type: "Diagnostiek",
      city: "Amsterdam",
      max_days: 28,
      count: 1,
      considered: 3,
      unreported: 2,
      source: "Nederlandse Zorgautoriteit (NZa)",
      norm_days: [28, 28],
      norm_source: "TH/BR-025",
      results: [row],
    },
    ...over,
  };
}

function stub(body: AssistantReply) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => body }),
  );
}

afterEach(() => vi.unstubAllGlobals());

async function askAbout(body: AssistantReply) {
  stub(body);
  const user = userEvent.setup();
  render(<Assistant treatments={treatments} />);
  await user.type(screen.getByLabelText(/vraag het in uw eigen woorden/i), "MRI heup Amsterdam");
  await user.click(screen.getByRole("button", { name: /zoek/i }));
}

describe("Assistant", () => {
  it("prints back what it searched for, so a wrong reading is visible", async () => {
    await askAbout(reply());
    const label = await screen.findByText(/gezocht op/i);
    // Scoped to the readback: the example buttons mention Amsterdam too.
    const readback = label.nextElementSibling!.textContent!;
    expect(readback).toContain("MRI heup(en)/ onderste extremiteit(en).");
    expect(readback).toContain("Amsterdam");
    expect(readback).toContain("binnen 28 dagen");
  });

  it("says how many locations reported nothing rather than hiding them", async () => {
    await askAbout(reply());
    expect(await screen.findByText(/2 zonder gemelde wachttijd/)).toBeInTheDocument();
    expect(screen.getByText(/1 van de 3/)).toBeInTheDocument();
  });

  it("admits when it read the question without a model", async () => {
    const body = reply();
    body.understood.read_by = "rules";
    await askAbout(body);
    expect(await screen.findByText(/gelezen zonder taalmodel/i)).toBeInTheDocument();
  });

  it("says so when nothing meets the deadline instead of showing the nearest thing", async () => {
    const body = reply();
    body.answer!.count = 0;
    body.answer!.results = [];
    await askAbout(body);
    expect(
      await screen.findByText(/geen enkele locatie meldt een wachttijd binnen die termijn/i),
    ).toBeInTheDocument();
  });

  it("passes on a question it could not place, without guessing", async () => {
    await askAbout({
      understood: {
        treatment_key: null,
        city: null,
        max_days: null,
        within_norm: false,
        read_by: "rules",
      },
      error: "Ik kon er geen behandeling in herkennen.",
    });
    expect(await screen.findByText(/geen behandeling herkend/i)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

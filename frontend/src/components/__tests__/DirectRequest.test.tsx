import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DirectRequest } from "@/components/DirectRequest";
import type { Treatment } from "@/lib/api";

const treatments: Treatment[] = [
  {
    treatment_key: "beh",
    treatment: "Initiele totale knie vervanging (orthopedie)",
    specialism: "Orthopedie (305)",
    treatment_type: "Behandeling",
    location_count: 116,
    norm_days: [42, 49],
  },
];

/** A date comfortably beyond any norm, so the request is warranted. */
function farFuture(): string {
  const date = new Date();
  date.setDate(date.getDate() + 200);
  return date.toISOString().slice(0, 10);
}

function soon(): string {
  const date = new Date();
  date.setDate(date.getDate() + 10);
  return date.toISOString().slice(0, 10);
}

async function fillIn(appointment: string) {
  const user = userEvent.setup();
  render(<DirectRequest treatments={treatments} />);
  await user.click(screen.getByRole("button", { name: /vraag zorgbemiddeling aan/i }));
  await user.selectOptions(screen.getByLabelText(/behandeling/i), "beh");
  await user.type(screen.getByLabelText(/zorgaanbieder/i), "Sint Antonius Utrecht");
  await user.type(screen.getByLabelText(/datum van uw afspraak/i), appointment);
  await user.type(screen.getByLabelText(/uw naam/i), "J. Hubbers");
  await user.selectOptions(screen.getByLabelText(/zorgverzekeraar/i), "Zilveren Kruis");
  return user;
}

describe("DirectRequest", () => {
  it("starts as an invitation, not a form", () => {
    render(<DirectRequest treatments={treatments} />);
    expect(screen.getByText(/heeft u al een afspraak/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/zorgaanbieder/i)).not.toBeInTheDocument();
  });

  it("addresses the finished request to the insurer that was chosen", async () => {
    await fillIn(farFuture());
    const link = screen.getByRole("link", { name: /open het verzoek/i });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:zorgbemiddeling@zilverenkruis.nl.invalid"),
    );
  });

  it("builds the letter from the appointment, not from reported figures", async () => {
    await fillIn(farFuture());
    const letter = document.querySelector("pre")!.textContent!;
    expect(letter).toContain("Sint Antonius Utrecht");
    expect(letter).toContain("200 dagen vanaf vandaag");
    expect(letter).toContain("de afspraak die mij is gegeven");
    expect(letter).not.toContain("Zorgbeeldportaal");
  });

  it("does not draft a request for a wait that is inside the norm", async () => {
    await fillIn(soon());
    expect(screen.getByText(/valt binnen de treeknorm/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open het verzoek/i })).not.toBeInTheDocument();
  });
});

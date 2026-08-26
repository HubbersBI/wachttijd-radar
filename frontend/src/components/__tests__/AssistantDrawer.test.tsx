import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AssistantDrawer } from "@/components/AssistantDrawer";
import type { Treatment } from "@/lib/api";

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

const panel = () => screen.getByRole("dialog", { hidden: true });

describe("AssistantDrawer", () => {
  it("stays out of the way until it is asked for", () => {
    render(<AssistantDrawer treatments={treatments} />);
    expect(panel()).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: /stel een vraag/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("slides in when the button is pressed, with the caret in the question", async () => {
    const user = userEvent.setup();
    render(<AssistantDrawer treatments={treatments} />);
    await user.click(screen.getByRole("button", { name: /stel een vraag/i }));
    expect(panel()).toHaveAttribute("aria-hidden", "false");
    expect(document.activeElement).toBe(document.getElementById("vraag"));
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<AssistantDrawer treatments={treatments} />);
    await user.click(screen.getByRole("button", { name: /stel een vraag/i }));
    await user.keyboard("{Escape}");
    expect(panel()).toHaveAttribute("aria-hidden", "true");
  });

  it("closes from its own sluiten link", async () => {
    const user = userEvent.setup();
    render(<AssistantDrawer treatments={treatments} />);
    await user.click(screen.getByRole("button", { name: /stel een vraag/i }));
    await user.click(screen.getByRole("button", { name: /sluiten/i }));
    expect(panel()).toHaveAttribute("aria-hidden", "true");
  });
});

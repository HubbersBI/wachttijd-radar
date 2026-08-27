import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DemoNotice, ZORGKAART } from "@/components/DemoNotice";

describe("DemoNotice", () => {
  beforeEach(() => localStorage.clear());

  it("says what the site is before the page is used", async () => {
    render(<DemoNotice />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/geen zorgdienst/i)).toBeInTheDocument();
  });

  it("points at a service that is actually maintained", async () => {
    render(<DemoNotice />);
    await screen.findByRole("dialog");
    const link = screen.getByRole("link", { name: /ZorgkaartNederland/i });
    expect(link).toHaveAttribute("href", ZORGKAART);
    // Opening in a new tab must not hand the opener over with it.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("stays dismissed for this browser once it has been read", async () => {
    const first = render(<DemoNotice />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: /ik begrijp het/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    first.unmount();
    render(<DemoNotice />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<DemoNotice />);
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows again when storage is unavailable, rather than staying silent", async () => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("storage blocked");
    };
    try {
      render(<DemoNotice />);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    } finally {
      Storage.prototype.getItem = getItem;
    }
  });
});

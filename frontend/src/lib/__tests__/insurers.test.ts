import { describe, expect, it } from "vitest";

import { DEMO_SUFFIX, INSURERS, byConcern, emailFor, findInsurer } from "@/lib/insurers";

describe("insurers", () => {
  it("covers the concerns that between them hold almost the whole market", () => {
    const concerns = new Set(INSURERS.map((i) => i.concern));
    for (const concern of ["Achmea", "VGZ", "CZ", "Menzis", "DSW", "ONVZ"]) {
      expect(concerns).toContain(concern);
    }
  });

  it("never addresses a real insurer", () => {
    for (const insurer of INSURERS) {
      expect(emailFor(insurer).endsWith(DEMO_SUFFIX)).toBe(true);
    }
  });

  it("gives every label its own address", () => {
    const addresses = INSURERS.map(emailFor);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it("groups labels under the concern that handles the bemiddeling", () => {
    const achmea = byConcern().find((group) => group.concern === "Achmea");
    expect(achmea?.insurers.map((i) => i.name)).toContain("Zilveren Kruis");
    expect(achmea?.insurers.map((i) => i.name)).toContain("FBTO");
  });

  it("lists each concern once, so the dropdown does not repeat groups", () => {
    const concerns = byConcern().map((group) => group.concern);
    expect(new Set(concerns).size).toBe(concerns.length);
  });

  it("finds a label by name and nothing by a name that is not there", () => {
    expect(findInsurer("Anderzorg")?.concern).toBe("Menzis");
    expect(findInsurer("Niet Bestaand")).toBeNull();
  });
});

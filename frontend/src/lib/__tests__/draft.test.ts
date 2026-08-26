import { describe, expect, it } from "vitest";

import type { Wachttijd } from "@/lib/api";
import { buildDraft, draftSubject } from "@/lib/draft";

const row: Wachttijd = {
  location_key: "abc",
  care_provider: "Sint Antonius",
  location: "Sint Antonius Ziekenhuis Locatie Utrecht",
  postal_code: "3543AZ",
  city: "Utrecht",
  treatment_key: "def",
  treatment: "Initiele totale knie vervanging (orthopedie)",
  treatment_type: "Behandeling",
  specialism: "Orthopedie (305)",
  days: 256,
  insufficient_observations: false,
  supplied_at: "2026-08-18T08:00:00.000Z",
  fetched_at: "2026-08-26T09:00:00+00:00",
  norm_days: [42, 49],
  norm_verdict: "exceeded",
};

const draft = (over: Partial<Parameters<typeof buildDraft>[0]> = {}) =>
  buildDraft({ row, norm: [42, 49], name: "", insurer: "", ...over });

describe("buildDraft", () => {
  it("cites the provider, the wait, the report date and the source", () => {
    const text = draft();
    expect(text).toContain("Sint Antonius Ziekenhuis Locatie Utrecht");
    expect(text).toContain("256 dagen");
    expect(text).toContain("18 aug 2026");
    expect(text).toContain("Nederlandse Zorgautoriteit");
  });

  it("states the excess against the norm that holds under either reading", () => {
    expect(draft()).toContain("207 dagen boven");
  });

  it("does not claim which norm applies when the source cannot say", () => {
    const text = draft({ row: { ...row, days: 45, norm_verdict: "depends" } });
    expect(text).toContain("boven de norm van 6 weken");
    expect(text).toContain("vermeldt niet of deze behandeling poliklinisch of klinisch is");
    expect(text).not.toMatch(/\d+ dagen boven/);
  });

  it("uses the single norm for a polikliniekbezoek", () => {
    const poli = { ...row, treatment_type: "Polikliniekbezoek", days: 40, norm_days: [28, 28] as [number, number] };
    const text = buildDraft({ row: poli, norm: [28, 28], name: "", insurer: "" });
    expect(text).toContain("4 weken (28 dagen)");
    expect(text).toContain("12 dagen boven");
  });

  it("leaves visible placeholders rather than inventing a name or insurer", () => {
    const text = draft();
    expect(text).toContain("[uw naam]");
    expect(text).toContain("[uw zorgverzekeraar]");
  });

  it("uses what the person typed when they typed it", () => {
    const text = draft({ name: "J. Hubbers", insurer: "Zilveren Kruis" });
    expect(text).toContain("J. Hubbers");
    expect(text).toContain("Zilveren Kruis");
    expect(text).not.toContain("[uw naam]");
  });

  it("refuses to draft a request for a wait that was never reported", () => {
    expect(() =>
      draft({ row: { ...row, days: null, insufficient_observations: true } }),
    ).toThrow();
  });
});

describe("what the request asks for", () => {
  it("names no alternative provider - that is the insurer's job to find", () => {
    const text = draft();
    expect(text).not.toContain("Volgens dezelfde bron");
  });

  it("asks for care within the norm, as close to home as possible", () => {
    const text = draft();
    expect(text).toContain("binnen de treeknorm terecht kan");
    expect(text).toContain("zo dicht mogelijk bij mijn woonplaats");
  });
});

describe("buildDraft naming the place", () => {
  it("does not repeat a city the location name already carries", () => {
    const text = draft();
    expect(text).toContain("Sint Antonius Ziekenhuis Locatie Utrecht");
    expect(text).not.toContain("Locatie Utrecht, Utrecht");
  });

  it("adds the city when the name does not carry it", () => {
    const elsewhere = { ...row, location: "Diakonessenhuis", city: "Zeist" };
    const text = draft({ row: elsewhere });
    expect(text).toContain("Diakonessenhuis, Zeist");
  });
});

describe("draftSubject", () => {
  it("names the treatment, which is what an insurer sorts on", () => {
    expect(draftSubject(row)).toContain("zorgbemiddeling");
    expect(draftSubject(row)).toContain("knie vervanging");
  });
});

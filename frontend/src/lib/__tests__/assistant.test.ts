/**
 * The same readings asserted by `backend/tests/test_assistant.py`.
 *
 * Two implementations of one parse only stay honest if both are held to the same
 * cases. If a test here has no twin there, one of them has drifted.
 */
import { describe, expect, it } from "vitest";

import type { Treatment } from "@/lib/api";
import { parseWithRules } from "@/lib/assistant";

const CITIES = [
  "Bergen op Zoom",
  "Amsterdam",
  "Groningen",
  "Eindhoven",
  "Rotterdam",
  "Utrecht",
  "Bergen",
];

function treatment(key: string, name: string, type = "Behandeling"): Treatment {
  return {
    treatment_key: key,
    treatment: name,
    specialism: null,
    treatment_type: type,
    location_count: 1,
    norm_days: [42, 49],
  };
}

const TREATMENTS: Treatment[] = [
  treatment("staar", "Initiële staaroperatie (oogheelkunde)"),
  treatment("knie", "Initiële totale knie vervanging (orthopedie)"),
  treatment("heup", "Initiële totale heupvervanging (orthopedie)"),
  treatment("mri", "MRI", "Diagnostiek"),
  treatment("bypass", "Aortocoronaire bypass-operatie als zelfstandige verrichting"),
];

const read = (question: string) => parseWithRules(question, TREATMENTS, CITIES);

describe("deadlines", () => {
  it("reads a deadline in weeks", () => {
    expect(read("binnen 4 weken").max_days).toBe(28);
  });

  it("reads a deadline in days and months", () => {
    expect(read("binnen 10 dagen").max_days).toBe(10);
    expect(read("binnen 2 maanden").max_days).toBe(60);
    expect(read("binnen een maand").max_days).toBe(30);
  });

  it("treats no deadline as no deadline", () => {
    expect(read("staar in Utrecht").max_days).toBeNull();
  });

  it("flags a request for the treeknorm rather than guessing a number", () => {
    // The norm depends on the treatment, so the parse must not invent one.
    const understood = read("staar binnen de treeknorm");
    expect(understood.within_norm).toBe(true);
    expect(understood.max_days).toBeNull();
  });
});

describe("cities", () => {
  it("finds the city", () => {
    expect(read("staar in Groningen").city).toBe("Groningen");
  });

  it("prefers the longer city name", () => {
    // Otherwise "Bergen op Zoom" is read as "Bergen".
    expect(read("MRI in Bergen op Zoom").city).toBe("Bergen op Zoom");
  });

  it("does not invent a city that was not mentioned", () => {
    expect(read("staaroperatie binnen 3 weken").city).toBeNull();
  });
});

describe("treatments", () => {
  it("maps a lay term onto the official name", () => {
    expect(read("ik wil een staaroperatie").treatment_key).toBe("staar");
  });

  it("does not let a shared suffix beat the real match", () => {
    // "operatie" is a stopword precisely so that "staaroperatie" cannot match
    // "Aortocoronaire bypass-operatie".
    expect(read("staaroperatie").treatment_key).toBe("staar");
  });

  it("reads a whole question", () => {
    const understood = read(
      "Ik wil een afspraak binnen 4 weken in Rotterdam voor een knie vervanging",
    );
    expect(understood.treatment_key).toBe("knie");
    expect(understood.city).toBe("Rotterdam");
    expect(understood.max_days).toBe(28);
  });

  it("says so rather than guessing when nothing matches", () => {
    expect(read("waar kan ik terecht").treatment_key).toBeNull();
  });

  it("reports that no model read the question", () => {
    expect(read("staar").read_by).toBe("rules");
  });
});

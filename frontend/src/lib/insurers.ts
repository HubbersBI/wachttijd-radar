/**
 * Dutch zorgverzekeraars, grouped by the concern that actually handles zorgbemiddeling.
 *
 * People know their own label - "ik zit bij Anderzorg" - but the zorgplicht and the
 * bemiddeling desk sit with the concern, so the list is grouped by concern and every
 * label maps to its own address.
 *
 * The addresses are FABRICATED. `.invalid` is reserved by RFC 2606 and can never
 * resolve, so nothing here can reach a real insurer. That is deliberate: this is a
 * portfolio demo on a public repository, and without it a curious visitor would open
 * a mail client addressed to a real company. Remove DEMO_SUFFIX to use real desks.
 */

export const DEMO_SUFFIX = ".invalid";

export type Insurer = {
  /** The brand someone recognises from their pas. */
  name: string;
  /** The concern whose zorgbemiddeling desk handles the request. */
  concern: string;
  domain: string;
};

export const INSURERS: Insurer[] = [
  { name: "Zilveren Kruis", concern: "Achmea", domain: "zilverenkruis.nl" },
  { name: "FBTO", concern: "Achmea", domain: "fbto.nl" },
  { name: "Interpolis", concern: "Achmea", domain: "interpolis.nl" },
  { name: "De Friesland", concern: "Achmea", domain: "defriesland.nl" },
  { name: "ZieZo", concern: "Achmea", domain: "ziezo.nl" },

  { name: "VGZ", concern: "VGZ", domain: "vgz.nl" },
  { name: "Univé", concern: "VGZ", domain: "unive.nl" },
  { name: "IZA", concern: "VGZ", domain: "iza.nl" },
  { name: "IZZ", concern: "VGZ", domain: "izz.nl" },
  { name: "Bewuzt", concern: "VGZ", domain: "bewuzt.nl" },
  { name: "Zekur", concern: "VGZ", domain: "zekur.nl" },
  { name: "United Consumers", concern: "VGZ", domain: "unitedconsumers.com" },

  { name: "CZ", concern: "CZ", domain: "cz.nl" },
  { name: "CZdirect", concern: "CZ", domain: "czdirect.nl" },
  { name: "Just", concern: "CZ", domain: "justverzekerd.nl" },
  { name: "Nationale-Nederlanden", concern: "CZ", domain: "nn.nl" },
  { name: "OHRA", concern: "CZ", domain: "ohra.nl" },

  { name: "Menzis", concern: "Menzis", domain: "menzis.nl" },
  { name: "Anderzorg", concern: "Menzis", domain: "anderzorg.nl" },
  { name: "VinkVink", concern: "Menzis", domain: "vinkvink.nl" },

  { name: "DSW", concern: "DSW", domain: "dsw.nl" },
  { name: "Stad Holland", concern: "DSW", domain: "stadholland.nl" },
  { name: "inTwente", concern: "DSW", domain: "intwente.nl" },

  { name: "a.s.r.", concern: "a.s.r.", domain: "asr.nl" },
  { name: "Ditzo", concern: "a.s.r.", domain: "ditzo.nl" },

  { name: "ONVZ", concern: "ONVZ", domain: "onvz.nl" },
  { name: "VvAA", concern: "ONVZ", domain: "vvaa.nl" },
  { name: "PNOzorg", concern: "ONVZ", domain: "pnozorg.nl" },

  { name: "Salland", concern: "Eno", domain: "salland.nl" },
  { name: "HollandZorg", concern: "Eno", domain: "hollandzorg.com" },

  { name: "Zorg en Zekerheid", concern: "Zorg en Zekerheid", domain: "zorgenzekerheid.nl" },
];

/** The zorgbemiddeling desk for one insurer. Fabricated - see DEMO_SUFFIX. */
export function emailFor(insurer: Insurer): string {
  return `zorgbemiddeling@${insurer.domain}${DEMO_SUFFIX}`;
}

export function findInsurer(name: string): Insurer | null {
  return INSURERS.find((insurer) => insurer.name === name) ?? null;
}

/** Labels grouped by concern, in list order, for the dropdown. */
export function byConcern(): { concern: string; insurers: Insurer[] }[] {
  const groups: { concern: string; insurers: Insurer[] }[] = [];
  for (const insurer of INSURERS) {
    const last = groups[groups.length - 1];
    if (last && last.concern === insurer.concern) last.insurers.push(insurer);
    else groups.push({ concern: insurer.concern, insurers: [insurer] });
  }
  return groups;
}

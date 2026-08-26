# Wachttijd-radar - notes

Dutch healthcare waiting-time navigator. Portfolio project. Built step by step.

## The idea

Waiting times are the most-felt failure of Dutch healthcare, and the data is
scattered across hundreds of provider websites. Make them visible, comparable
against the **treeknormen**, and actionable - by drafting the
**zorgbemiddeling** request the insurer is obliged to act on. Most people do
not know that right exists, which is what makes the app worth building.

Needs a login screen and an AI assistant. (What the login is actually for, and
what it is not, is settled at the end of this file.)

## First decision, before anything else

**Where does the waiting-time data actually come from?** The project is either
real or a mockup depending on the answer, and every other decision follows from
it.

Candidates, roughly in order of realism:

- Individual zorgaanbieders publish their own wachttijden - scattered, varying
  formats, one adapter per source
- GGZ providers carry publication obligations, so coverage there is better
- Open data: Vektis, Zorgkaart Nederland, CBS
- Treeknormen as the benchmark to compare against, not a source in themselves

These names are recalled, not verified. **Check each one exists, is current,
and permits this use before building anything against it.**

Whatever is chosen: one interface, two implementations - a real adapter and a
synthetic generator, selected by environment variable. That pattern worked well
in Artifinancial, and it means the app demos with no network and no scraping.

## Normalisation is where the real work is

Sources disagree about units (weeks vs days), about what is being measured
(**aanmeldwachttijd and behandelwachttijd are different things** and must never
be merged), about region naming, and about freshness.

Every stored figure needs its unit, which kind of wait it measures, the date it
was published, and the date it was fetched. A number without its date cannot be
shown honestly.

## Boundaries - these are not open questions

- **Synthetic or public data only.** No real patient data, ever.
- **Navigation and drafting, not diagnosis.** Anything resembling a symptom
  checker drifts toward medical-device territory under MDR, and health AI is
  high-risk under the EU AI Act. Say so in the README - showing you know the
  line exists is itself a portfolio signal.
- **Cite the source and the date on every figure.** A stale number shown as
  current is the main way this app could mislead someone.
- **Respect robots.txt and terms of use** on every source. Rate-limit, cache,
  identify the client.
- **On DigiD:** a DigiD-*style* login is the most authentic Dutch touch
  available, and must be clearly a demo. Do not copy the real branding,
  wordmark or domain - a convincing fake reads as a phishing prototype.

## Reusable from Artifinancial when the time comes

The local Artifinancial project has a working multi-stage Dockerfile,
docker-compose, and idempotent start/stop scripts for Mac and Windows. Copy
them once the stack is chosen - they assume FastAPI serving a static frontend
export on one port.

---

## Verified 2026-08-26 - the first decision is settled

Checked live, not recalled. The project is **real**, not a mockup.

### Primary source: NZa Zorgbeeld open API (medisch-specialistische zorg)

`GET https://zorgbeeld.nza.nl/openapi/WaitingTimeMSZ` - open, unauthenticated,
JSON, national. Optional `?KVKNummer=` filter. Spec at
`https://zorgbeeld.nza.nl/rest-doc/openapi/openapi.json`.

Pulled 2026-08-26: 11,325 rows, 335 zorgaanbieders, 811 locaties,
117 behandelingen, 33 specialismen, 225 steden, 8.4 MB.

Per row: `WaitingTime` (**days**), `TreatmentType`
(Polikliniekbezoek / Behandeling / Diagnostiek), `Date` (per-record supply
date), `InsufficientObservations` (Ja/Nee - 1730 rows flagged), `PostalCode`,
`City`, `Location`, `KVKNumber`, `CareProvider_AGBCode`, `Treatment`,
`Specialism`, `Description` (incl. zorgactiviteitencodes).

Medians confirm the unit is days: poli 28, behandeling 40, diagnostiek 15.
Dataset refreshes **biweekly**; figures are medians, and diagnostiek/poli use a
different rekenmethode than behandelingen.

No scraping. No robots.txt concern. No adapter-per-provider. The scattered-
website problem the notes assumed is already solved for MSZ.

### GGZ is harder than MSZ, not easier - the notes had this backwards

- `WaitingTimeGGZ` -> 404. There is no NZa open API for ggz.
- Per 2026-01-01 single-location ggz providers no longer supply manually;
  wachttijden are derived from declaratiedata. Two data streams run side by
  side through 2026, and some published ggz figures are unavailable during the
  transition.
- Ggz data lives with Vektis: monthly databestanden + dashboards, and
  retrospective wachttijden (referral->intake, intake->start behandeling) since
  2026-07-06, per hoofddiagnosegroep / regio / aanbieder.
- **Vektis terms are not an open licence:** personal and/or research use only,
  no resale, no commercial use, attribution required ("bron: Vektis").
  Acceptable for a portfolio project. Must be cited. Rules out commercial use.

### Treeknormen (NZa Beleidsregel toezichtkader zorgplicht, TH/BR-025)

| Zorgsoort | Norm | 80%-norm |
|---|---|---|
| Polikliniekbezoek (MSZ + ggz aanmelding) | 4 wk / 28 d | 3 wk |
| Diagnostiek / intake | 4 wk / 28 d | 3 wk |
| Poliklinische / ambulante behandeling | 6 wk / 42 d | 4 wk |
| Klinische behandeling | 7 wk / 49 d | 5 wk |
| Huisarts | 3 werkdagen | 2 werkdagen |

**Open question, deferred with ggz:** ggz reporting commonly quotes aanmeld 4 wk +
behandel 10 wk = totaal 14 wk, which does not match TH/BR-025's 4/6/7. Different
measurement start points. This does not block v1 - ggz is out of scope - and must be
settled before any ggz adapter is written.

**Second open question - resolved 2026-08-26, and not by preference.** The NZa
`TreatmentType` value `Behandeling` does not say whether it is poliklinisch (6 wk) or
klinisch (7 wk). Checked the regulation rather than guessing:

- **NR/REG-2421 art. 4 lid 5** has providers submit treatment waiting times for the
  behandelingen in bijlage 1 as **one undifferentiated category**. The distinction is
  genuinely absent from the source, not missing from our mapping.
- **RIVM/VZinfo publishes these same figures against "een treeknorm van 6 of 7
  weken"** - the national statistics body declines to pick one too.

So the norm for a behandeling is reported as a **range**, and the verdict has three
states rather than two:

| Wait | Verdict |
| --- | --- |
| <= 42 days | within the norm under either reading |
| 43-49 days | depends on poliklinisch or klinisch, which the source does not say |
| > 49 days | over the norm under either reading |

Polikliniekbezoek and diagnostiek are unambiguous at 28 days.

Note what the norm binds: TH/BR-025 is the toezichtkader for the **insurer's**
zorgplicht, not a rule the hospital breaks. Exceeding it is what entitles someone to
ask their insurer for zorgbemiddeling. The interface says that, and does not accuse
the provider of anything.

### Zorgbemiddeling - premise confirmed

Insurers carry a statutory zorgplicht under the Zvw. Exceeding the treeknorm
gives the insured an immediate right to free zorgbemiddeling, and providers
have a duty to mention it. Confirmed via NZa, SKGZ, Rijksoverheid,
Consumentenbond. The drafting feature rests on something real.

### Consequence for the plan

- **v1 scope = MSZ only, real data, day one.** Ggz becomes a second adapter
  once the 2026 transition settles.
- The adapter interface still holds, but the synthetic generator drops from
  necessity to convenience: offline demo and tests, not the fallback the app
  depends on.
- Normalisation work is smaller than feared for MSZ (one source, one unit,
  one schema) and moves to where it actually bites: mapping `TreatmentType` to
  the right treeknorm, and honouring `InsufficientObservations`.

### Settled 2026-08-26 - what the login is for

The line at the top of these notes asserts a login without saying why. Asked
directly, there is no product reason: nothing in the app is per-person. You pick a
treatment and read a comparison, and the zorgbemiddeling draft is a form filled
fresh each time and never persisted. There is nothing to log in to.

The reason is the one already given further up - a DigiD-*style* screen is the most
authentic Dutch touch available. That is a portfolio reason, and a fair one, but it
should be called what it is: the login demonstrates the pattern. It gates nothing.

**Crowdsourced waiting times are the feature that would justify accounts, and they
are a stated non-goal.** Letting people report what they actually waited, against
what providers report, is genuinely valuable - providers self-report to their own
regulator and nobody checks them. Two reasons not to:

- It converts an app over public aggregate data into a register of identified people
  and their medical waits. AVG art. 9, the AP's top enforcement priority. A DPIA, a
  legal basis and a retention policy, not a feature.
- The comparison would mislead. The NZa figure is a median of waits that
  **completed**. Anyone volunteering "I have been waiting 200 days" is by definition
  still waiting, so responses come from the long tail. Length-biased sampling makes
  self-reported waits look systematically worse than reported ones even when every
  provider reports honestly. The comparison is still interesting; it cannot be
  presented as "they understated it by 44 days".

The same reasoning rules out accounts in general - a saved watch on a treatment
reveals someone's medical situation as surely as a free-text box would. Which is the
useful finding: in this app, nearly every use of an account lands in art. 9.

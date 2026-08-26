# Wachttijd-radar — Plan

The shape of the thing being built. Why it exists and what the data is: `NOTES.md`.
Rules that must not be broken while building it: `CLAUDE.md`.

This document covers what is **decided**. Open questions stay in `NOTES.md` until
they are answered, and move here once they are.

## v1 scope

Medisch-specialistische zorg only, from the NZa Zorgbeeld open API.

A user picks a treatment and a place, sees which providers are over the treeknorm
and by how much, and gets a drafted zorgbemiddeling request for the ones that are.

**Ggz is out of v1.** There is no ggz endpoint on the NZa API, and the 2026
transition to declaratiedata means published ggz figures are unreliable right now.
It becomes a second adapter behind the same interface when: the transition settles,
and the Vektis non-commercial terms are acceptable for whatever the app has become.

## Build order

1. **Fetch → store → show.** The honest slice: pull the API, normalise into SQLite,
   one ranked screen. No login, no AI, no ggz. This proves the app is real.
2. **Treeknorm check.** Only after TH/BR-025 is read and the two open questions in
   `NOTES.md` are answered. Until then, show the wait without a verdict.
3. **Zorgbemiddeling draft.** Deterministic template over stored figures.
4. **DigiD-style demo login, then the AI assistant.** Both are presentation over
   something that already works, so they come last. Both are also where the hard
   boundaries below start to bite — read them before starting this step, not
   after. The assistant's input contract is structured parameters; if a design
   for it needs a free-text box, the design is wrong.

## Data flow

```
NZa API  ──fetch──>  raw snapshot on disk  ──normalise──>  SQLite  ──>  /api  ──>  UI
         (biweekly)   (cached, replayable)   (once, on write)
```

Normalisation happens once on write, never in the read path. Development works from
the cached snapshot — the API is not called in a loop.

## Storage

One table, denormalised. 11k rows per fetch, biweekly; there is nothing here that
justifies joins.

```sql
CREATE TABLE wachttijd (
  location_key              TEXT    NOT NULL,
  kvk_number                TEXT    NOT NULL,
  care_provider             TEXT    NOT NULL,
  location                  TEXT    NOT NULL,
  postal_code               TEXT,
  city                      TEXT,
  treatment_key             TEXT    NOT NULL,
  treatment                 TEXT    NOT NULL,
  treatment_type            TEXT    NOT NULL,  -- Polikliniekbezoek | Behandeling | Diagnostiek
  specialism                TEXT,
  days                      INTEGER,           -- NULL when insufficient_observations
  insufficient_observations INTEGER NOT NULL,  -- 0 | 1
  supplied_at               TEXT    NOT NULL,  -- source Date, when the provider reported
  fetched_at                TEXT    NOT NULL,  -- when we pulled it
  UNIQUE (location_key, treatment_key, supplied_at)
);
```

The UNIQUE key is what makes snapshots accumulate: re-fetching the same reported
figure is a no-op, a new report is a new row. The API only ever returns now — this
is how a wait can be shown moving over time later.

`days` is nullable on purpose. When the source says the observations are
insufficient there is no number, and the absence must survive to the UI rather than
being filled with a zero or an average.

Treeknormen live in code, not in the database. They are policy, not data.

## API

Step 1 needs three endpoints.

```
GET /api/health                              -> row count, fetched_at, newest report
GET /api/treatments                          -> treatments + specialisms, for the picker
GET /api/wachttijden?treatment_key=&city=    -> ranked rows, each carrying its own dates
```

Every row returned by `/api/wachttijden` carries `days`, `treatment_type`,
`insufficient_observations`, `supplied_at` and `fetched_at`. The frontend is never
handed a bare number.

**Treatments are identified by `treatment_key`, never by name.** Four keys carry more
than one name because the label was revised over time ("Anti-snurkbehandeling" became
"Behandeling vanwege apneu"). Grouping by name would split one treatment across two
lists and hide providers from the comparison, which is the failure this app exists to
prevent.

Reads always resolve to the latest report per location and treatment. The table is a
history; without that, a provider would appear once per report it has ever filed.

## The screen

One page. Pick a treatment, pick a city or postcode. Get a list of providers ordered
by wait, shortest first. Each row shows the provider and location, the wait in days,
how it compares to the treeknorm, and the date the provider reported it. Rows with
insufficient observations appear in the list and say so, rather than vanishing.

That is the whole of v1's UI. Everything else is added on top of a screen that
already tells the truth.

## Adapters

One interface, two implementations, selected by environment variable:

- `NzaAdapter` — the real source.
- `SyntheticAdapter` — offline demo and tests.

The synthetic path is a convenience, not a fallback the app depends on. If the real
adapter breaks, the app says the data is stale; it does not quietly serve invented
numbers.

**Each source writes its own database file.** Synthetic rows must never land in the
table of reported ones - once mixed, an invented number is indistinguishable from a
number a hospital actually filed.

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `WACHTTIJD_SOURCE` | `nza` | `synthetic` runs the offline generator |
| `WACHTTIJD_DB_DIR` | `db/` | Directory for the database; the volume in the container |
| `WACHTTIJD_DB` | unset | Full path override, wins over both |
| `WACHTTIJD_PORT` | `8000` | Host port for docker compose |

## Hard boundaries

Absolute. Not softened by this being a portfolio project — a portfolio project is
one you *publish*, which is the condition that makes most of these matter.

- **No symptom checking, triage, or advice on what care someone needs.** MDR and
  EU AI Act. The app navigates and drafts; it never assesses.
- **No free text reaches the model.** The assistant is handed structured
  parameters, never a sentence the user wrote. Anything a user types about their
  own health is AVG art. 9 data, and this keeps it out of a third-party LLM.
- **Drafts are not persisted.** The zorgbemiddeling draft is health data about the
  person requesting it. Rendered, copied, discarded — never logged or stored.
- **No real DigiD branding, wordmark, logo, colours or domain, and no flow that
  accepts real credentials.** Own name, own mark, same visual family, permanent
  demo banner. The legitimate route to real DigiD is via a recognised
  routeringsvoorziening and needs an organisation with an accepted
  aansluitaanvraag — worth a README sentence to show the real path is known.
- **No real patient data, ever.**

## Out of v1 — decisions, not boundaries

These could change. The ones above cannot.

- Ggz. Blocked on the 2026 transition and the Vektis terms, as above.
- Commercial use of Vektis data — blocked by their licence for as long as ggz data
  is in the app at all.
- Snapshot history as a visible feature. The schema records it from day one; no
  screen shows it in v1.

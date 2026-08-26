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
2. **Treeknorm check.** Done. The norm is marked on the same scale as the bars and
   the list says how many locations sit past it. The mapping question was answered
   from the regulation, not by preference - see Treeknormen below.
3. **Zorgbemiddeling draft.** Done. A deterministic template over the figures on
   the page, built entirely in the browser.
4. **DigiD-style demo login, then the AI assistant.** Both are presentation over
   something that already works, so they come last. Both are also where the hard
   boundaries below start to bite — read them before starting this step, not
   after. The assistant's input contract is structured parameters; if a design
   for it needs a free-text box, the design is wrong.

   **The login is a demonstration of the pattern, not a requirement.** Nothing in
   this app is per-person: you pick a treatment and read a comparison, and the
   zorgbemiddeling draft is a form filled fresh each time and never persisted.
   So the login gates nothing and holds no session state. Build it because a
   DigiD-*style* screen is the most authentic Dutch touch available and it shows
   the pattern is understood — not because the app needs one. Do not let it grow
   real session state without a reason that is written down here first.

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

Treeknormen live in code (`app/treeknorm.py`), not in the database. They are policy,
not data.

## API

Step 1 needs three endpoints.

```
GET /api/health                              -> row count, fetched_at, newest report
GET /api/treatments                          -> treatments + specialisms, for the picker
GET /api/wachttijden?treatment_key=&city=    -> ranked rows, each carrying its own dates
```

Every row returned by `/api/wachttijden` carries `days`, `treatment_type`,
`insufficient_observations`, `supplied_at`, `fetched_at`, `norm_days` and
`norm_verdict`. The frontend is never handed a bare number.

## Treeknormen

Source: NZa Beleidsregel toezichtkader zorgplicht zorgverzekeraars Zvw (TH/BR-025).

| Type | Norm | Verdict |
| --- | --- | --- |
| Polikliniekbezoek | 28 days | within / exceeded |
| Diagnostiek | 28 days | within / exceeded |
| Behandeling | 42–49 days | within / **depends** / exceeded |

**Behandeling is a range on purpose.** TH/BR-025 sets 6 weeks for poliklinische and 7
for klinische behandeling, but NR/REG-2421 art. 4 lid 5 has providers submit treatment
waiting times as one undifferentiated category. The distinction is absent from the
source, so a wait of 43–49 days is `depends`: over the norm if poliklinisch, within it
if klinisch. RIVM/VZinfo publishes the same figures against "6 of 7 weken" for the
same reason. Never collapse the band to a single norm.

A row with no number gets no verdict. Judging a wait we do not have would be worse
than showing none.

**The bar changes where the norm falls**, rather than a marker being laid on top of
it: blue up to the strict norm, striped through the band the source cannot place, red
past the lenient norm. A marker drawn over a solid bar disappears exactly when it
matters most - on the long waits. The verdict is also written in words on every row,
so it does not rest on colour alone.

**The norm binds the insurer, not the provider.** TH/BR-025 is the toezichtkader for
the zorgplicht. Exceeding the norm is what entitles someone to free zorgbemiddeling -
it is not a rule the hospital broke, and the interface must not say it is.

**Treatments are identified by `treatment_key`, never by name.** Four keys carry more
than one name because the label was revised over time ("Anti-snurkbehandeling" became
"Behandeling vanwege apneu"). Grouping by name would split one treatment across two
lists and hide providers from the comparison, which is the failure this app exists to
prevent.

Reads always resolve to the latest report per location and treatment. The table is a
history; without that, a provider would appear once per report it has ever filed.

## The zorgbemiddeling draft

Offered on any row whose wait passes the stricter norm. Whether it is over the 6-week
or the 7-week reading is the insurer's to determine - the person is asking, not
adjudicating - and the draft states the facts either way.

**Built in the browser and never sent anywhere.** The draft names someone's treatment
and their wait, which is health data about them, and the hard boundaries forbid
persisting it. Generating it client-side means their name and insurer never reach the
server: there is nothing to log, store or leak. That is a guarantee rather than a
policy, and it is why this is a pure function in `lib/draft.ts` and not an endpoint.
Nothing typed into it is written to localStorage either. Closing the panel is the
retention policy.

The draft cites the provider, the wait, the date it was reported, the source, and the
norm with the excess computed against the reading that holds either way. Then it asks
for care within the norm as close to home as possible.

**It names no alternative provider.** An earlier version cited the shortest wait in
the list, which produced things like "0 dagen at a private clinic in Amsterdam" for
someone in Limburg. Which provider is suitable, and how far a person can reasonably
travel, is the insurer's obligation to work out - naming one narrows a request that
should stay open.

Name and insurer are required, and the insurer is chosen from a list of Dutch labels
grouped by concern - people know their own brand, but the zorgplicht and the
bemiddeling desk sit with the concern.

**It is sent by mailto:, not by a backend.** Posting the letter to our own server to
send would put someone's treatment and their wait through our infrastructure, which
is the thing the boundary above forbids. Handing it to the person's own mail client
means it travels from their mailbox to their insurer and never passes through us, and
it is also how this should work in production rather than only in a demo.

The addresses are fabricated and end in `.invalid`, a suffix reserved by RFC 2606 that
can never resolve. This is a public repository: without that, a visitor clicking
through would open a mail client addressed to a real insurer. `DEMO_SUFFIX` in
`lib/insurers.ts` is the single place to change if real desks are ever wanted.

When the assistant arrives in step 4 it may adjust tone only. The name and insurer are
inserted after any model call, never sent to one.

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
  screen shows it in v1. Tried once and reverted: the run of past reports is not
  what someone facing a waiting time needs, and it crowded the current figure.
- **Accounts, and crowdsourced waiting times.** The obvious feature — let people
  report what they actually waited, and compare it against what providers report —
  is deliberately not built. Two reasons, and the second is the one people miss:
  - It converts an app over public aggregate data into a register of identified
    people and their medical waits. AVG art. 9, top enforcement priority. That is
    a DPIA and a retention policy, not a feature.
  - The comparison would mislead. The NZa figure is a median of waits that
    **completed**; anyone volunteering "I have been waiting 200 days" is by
    definition still waiting. Length-biased sampling makes self-reported waits look
    systematically worse than reported ones even when every provider is honest.

  The same reasoning rules out accounts generally: a saved watch on a treatment
  reveals someone's medical situation as surely as a free-text box would. This sits
  here rather than under the hard boundaries because it *could* change — but only
  deliberately, with the compliance work done first.

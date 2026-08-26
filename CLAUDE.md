# Wachttijd-radar

Dutch healthcare waiting-time navigator. Shows what the wait actually is, compares
it against the treeknorm, and drafts the zorgbemiddeling request the insurer is
obliged to act on.

Background, verified sources and open questions live in `NOTES.md`. Read it before
making a decision it already settles.

The plan below is what is decided. Anything not in it is not yet decided — check
`NOTES.md` rather than inventing an answer.

@planning/PLAN.md

## Invariants

These are not preferences. Breaking one makes the app misleading or unlawful.

- **Never show a figure without its source and both its dates.** `supplied_at`
  (when the provider reported it) and `fetched_at` (when we pulled it) are
  different things and both must survive to the UI. A number without its date
  cannot be shown honestly.
- **Never merge different kinds of wait.** `Polikliniekbezoek`, `Behandeling` and
  `Diagnostiek` are separate measurements with separate treeknormen, computed by
  different rekenmethoden. Same rule for ggz aanmeldwachttijd vs behandelwachttijd.
  Do not average across them, do not fall back from one to another.
- **Honour `InsufficientObservations`.** When the source says `Ja` there is no
  trustworthy number. Say so; do not render a wait, do not rank on it, do not let
  it disappear into an average.
- **Navigation and drafting, not diagnosis.** No symptom checking, no triage, no
  advice on what care someone needs. That drifts into medical-device territory
  under MDR and high-risk under the EU AI Act. The README says so explicitly.
- **Synthetic or public data only.** No real patient data, ever. Nothing personal
  arrives from the NZa source — it is provider-level aggregate medians, no people.
- **The user is the health-data risk, not the source.** Anything someone types
  about their own situation is a bijzonder persoonsgegeven under AVG art. 9, and
  the AP treats health data as top enforcement priority. Two consequences, both
  absolute:
  - **No free text reaches the model.** The assistant receives structured
    parameters only — treatment key, wait in days, the norm, the provider. Never
    a sentence the user wrote. This keeps art. 9 data out of a third-party LLM.
  - **Drafts are not persisted.** A zorgbemiddeling draft names someone's
    treatment and their wait; it *is* health data about them. Render it, let them
    copy it, discard it. Do not log it, store it, or attach it to an error report.
- **The AI assistant never invents a figure.** Numbers come from the database and
  are passed to the model, never produced by it. The zorgbemiddeling draft is a
  deterministic template first; the model may only adjust tone.
- **DigiD-style login must read as a demo.** No real DigiD branding, wordmark,
  logo, colours or domain, and no flow that accepts real credentials. DigiD is
  among the most-phished brands in the Netherlands and Logius takes down sites
  using the name to deceive — a convincing copy is a phishing kit whatever the
  intent. Build its own name and mark in the same visual family, with a
  persistent demo banner.
- **Cite Vektis when ggz data is used** ("bron: Vektis"). Their terms are
  personal/research use only, no commercial use, no resale. Not an open licence.

## Data source

Primary source is the NZa Zorgbeeld open API, unauthenticated, national, refreshed
biweekly:

```
GET https://zorgbeeld.nza.nl/openapi/WaitingTimeMSZ
```

Facts that are easy to get wrong:

- `WaitingTime` is in **days**, not weeks.
- `Date` is the per-record supply date, not the fetch time and not one batch date.
  Store it as `supplied_at` and set `fetched_at` ourselves.
- Figures are **medians**, and diagnostiek/polikliniek use a different calculation
  than behandelingen.
- Covers **medisch-specialistische zorg only**. There is no ggz endpoint;
  `WaitingTimeGGZ` returns 404. Ggz comes later, from Vektis, under the terms above.

Treeknormen: polikliniekbezoek 4 wk, diagnostiek 4 wk, poliklinische behandeling
6 wk, klinische behandeling 7 wk. `TreatmentType: Behandeling` does not say whether
it is poliklinisch or klinisch — see the open questions in `NOTES.md`. Do not
silently pick one norm.

Respect the source: rate-limit, cache to disk, identify the client with a real
User-Agent. Never hammer the API in a loop during development; work from the
cached snapshot.

## Stack

Copied from `C:\Users\jhhub\Projects\finally`, which has the working Dockerfile,
docker-compose and idempotent start/stop scripts.

- `backend/` — FastAPI + uv, Python 3.12. Serves `/api` and the static frontend
  export on one port.
- `frontend/` — Next.js 16 static export, React 19, Tailwind 4, vitest.
- `db/` — SQLite. One row per (location, treatment, supplied_at) so snapshots
  accumulate and a wait can be shown moving over time; the API only ever
  returns now.
- `scripts/` — start/stop for Mac and Windows.

One adapter interface, two implementations selected by environment variable: the
real NZa adapter and a synthetic generator. The synthetic path exists for offline
demo and tests, not as a fallback the app depends on.

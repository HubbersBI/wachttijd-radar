# Wachttijd-radar

Waiting times in Dutch medisch-specialistische zorg, per treatment and per location,
each figure shown with its source and the date the provider reported it.

Same treatment, four hospitals in Utrecht, on one day in August 2026: 30 days, 68
days, 256 days, and one location with too few observations to report a figure at
all. Making that comparable is the point.

## Run it

```bash
docker compose up --build -d          # http://localhost:8000
WACHTTIJD_PORT=8001 docker compose up -d   # if 8000 is taken
```

Or the scripts, which are safe to run repeatedly:

```powershell
.\scripts\start_windows.ps1 [-Port 8001] [-Synthetic]
.\scripts\stop_windows.ps1 [-RemoveData]
```

```bash
./scripts/start_mac.sh [--port 8001] [--synthetic]
./scripts/stop_mac.sh [--remove-data]
```

The first start fetches once from the NZa API into a named volume. Later starts
reuse it. `--synthetic` runs the demo with generated data, in a separate database
file so invented numbers can never mix with reported ones.

## Develop

```bash
cd backend  && uv run -m app.fetch && uv run uvicorn app.main:app --port 8000
cd frontend && npm run build     # or npm run dev for hot reload on :3000
```

Tests: `uv run --extra dev pytest` and `npm run test`.

## Data

Waiting times come from the [NZa Zorgbeeld open API](https://zorgbeeld.nza.nl/rest-doc/openapi),
refreshed biweekly. Every figure is a median in days as reported by the provider,
and is shown with the date it was reported. A location with insufficient
observations is listed as such, never as a wait of zero.

Ggz waiting times are not included: there is no NZa endpoint for them, and the 2026
transition to declaratiedata makes published figures unreliable. See `NOTES.md`.

## Scope

This app **navigates and drafts — it does not diagnose.** There is no symptom
checker, no triage, and no advice about what care someone needs. Anything of that
kind would move the app toward medical-device territory under the MDR and into
high-risk territory under the EU AI Act, which is a line this project stays well
clear of by design.

It uses public aggregate data only. No patient data, ever.

**There is no login.** Nothing in the app is per-person: you pick a treatment and read
a comparison, and a zorgbemiddeling request is a form filled fresh each time and never
kept. A login would have gated nothing. It was in the original plan as a DigiD-style
demo and was dropped once it became clear it had no job to do.

### Why there are no accounts, and no crowdsourced waiting times

The obvious next feature is to let people report what they actually waited and
compare it against what providers report. It is deliberately not built.

Collecting that turns an app over public aggregate data into a register of
identified people and their medical waits - special category data under AVG art. 9,
and the Dutch DPA's top enforcement priority. That is a different project, with a
DPIA, a legal basis and a retention policy, not a feature.

The comparison would also mislead. The NZa figure is a median of waits that
**completed**. Anyone volunteering "I have been waiting 200 days" is by definition
still waiting, so responses are drawn from the long tail. Length-biased sampling
makes self-reported waits look systematically worse than reported ones even when
every provider reports honestly.

The same reasoning rules out accounts generally. A saved watch on a treatment reveals
someone's medical situation just as plainly as the assistant's question box does. The
difference is that the question is transient - answered, shown, and gone - while a
watch has to be stored against a person to be a watch at all. Storing it is the part
this app does not do.

`CLAUDE.md` holds the full invariants and `planning/PLAN.md` the shape of the build.

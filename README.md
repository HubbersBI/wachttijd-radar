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

Any login screen here is a demonstration. It does not use DigiD branding and accepts
no real credentials; the legitimate route to DigiD runs through a recognised
routeringsvoorziening and requires an organisation with an accepted aansluitaanvraag.

`CLAUDE.md` holds the full invariants and `planning/PLAN.md` the shape of the build.

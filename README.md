# Wachttijd radar

**Full-stack web app on live government data, with an AI assistant.**

Dutch hospital waiting times, compared per treatment and per location, measured against
the legal norm — and turned into the formal request your insurer is obliged to act on.

`FastAPI + Next.js` · `11,325 live records from the Nederlandse Zorgautoriteit` ·
`natural-language search` · `one Docker command` · `104 tests`

![Waiting times for a knee replacement in Utrecht, compared against the treeknorm](docs/screenshots/01-vergelijking.png)

Four hospitals, one city, one treatment, on a single day in August 2026: **30, 68 and
256 days** — and one location that reported too few observations to give a figure at
all. All four are a twenty-minute drive apart.

Waiting times are the most-felt failure of Dutch healthcare, and almost nobody knows
that exceeding the **treeknorm** gives them the right to free *zorgbemiddeling* from
their insurer. Comparison sites tell you the number. This one tells you what it means
and what you can do about it.

---

## What it does

**Compares.** 11,325 waiting times across 335 providers and 811 locations, straight
from the Nederlandse Zorgautoriteit. Every figure carries the date the provider
reported it.

**Judges.** Each wait is measured against the treeknorm from NZa policy TH/BR-025. The
bar turns from green to red where the norm falls, so a list of 116 locations reads as a
gradient from acceptable to unacceptable without reading a single number.

**Acts.** Any wait past the norm can be turned into a zorgbemiddeling request, drafted
from the real figures and addressed to the right insurer.

![The drafted zorgbemiddeling request, citing the provider, the wait, the date and the norm](docs/screenshots/02-zorgbemiddeling.png)

**AI assistant.** A question in plain Dutch — *"MRI heup in Amsterdam binnen 4 weken"* —
resolves to a treatment, a city and a deadline, and returns rows from the database.

![The assistant panel answering a question in plain Dutch](docs/screenshots/03-zoekhulp.png)

---

## Stack

FastAPI + uv (Python 3.12) · Next.js 16 static export + React 19 + Tailwind 4 ·
SQLite · Docker, one image, one port · pytest + vitest · Groq for the assistant,
optional.

## Run it

```bash
docker compose up --build -d      # http://localhost:8000
```

First start fetches once from the NZa API into a named volume; later starts reuse it.
There are idempotent start/stop scripts for Windows and macOS in [`scripts/`](scripts).
No API key is needed for anything.

---

## How this was built

Written with **Claude Code (Opus 5)** in a single session, and the way it was run
matters more than the fact that it was:

**Small increments, each one verified before the next.** Fetch → store → API → screen →
container → norm check → request → assistant. Every step ended with tests passing and
the real thing running against real data, not with a claim that it should work.

**No subagents and no agent teams.** One session, direct edits, reviewed as they
happened. This was a project where every decision needed a person in the loop rather
than parallel work.

**Decisions recorded as they were made.** [`NOTES.md`](NOTES.md) holds the research and
the open questions, [`planning/PLAN.md`](planning/PLAN.md) the shape of the build, and
[`CLAUDE.md`](CLAUDE.md) the rules the code must not break — including one that was
deliberately relaxed to build the assistant, with the reason and the date written down.

---

## Scope

**Navigation and drafting, not diagnosis.** No symptom checker, no triage, no advice
about what care someone needs — that would move the app toward medical-device territory
under the MDR and high-risk territory under the EU AI Act.

**Public aggregate data only**, no accounts and no login. Nothing in the app is
per-person, so there is nothing to store and nothing to log in to.

Demo email addresses end in `.invalid` and cannot resolve, so nothing here can reach a
real insurer.

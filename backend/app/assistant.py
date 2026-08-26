"""Turn a question in plain Dutch into a query this app can already answer.

The model's only job is to pick a treatment, a city and a deadline. It never writes
the answer and never sees a figure: the numbers come from the database exactly as they
do for the rest of the app, so there is nothing for it to round, soften or invent.

That also keeps the app on the right side of its own boundary. A model that can only
emit a treatment key has no channel through which to diagnose anything.

Without GROQ_API_KEY, or with WACHTTIJD_LLM_MOCK=true, the same parse is done by rules
here. The demo and the tests then run with no key, no quota and no network.
"""

import json
import os
import re
from dataclasses import dataclass

import httpx

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# Overridable: Groq's free line-up changes. See console.groq.com for what is current.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """Je bent een zoekhulp voor Nederlandse ziekenhuiswachttijden.

Zet de vraag van de gebruiker om in een zoekopdracht. Antwoord uitsluitend met JSON:

{"treatment_key": "<sleutel of null>", "city": "<plaats of null>", "max_days": <getal of null>, "within_norm": <true of false>}

Regels:
- treatment_key moet exact een sleutel uit de lijst hieronder zijn, of null.
- city is de plaatsnaam zoals de gebruiker die noemt, of null.
- max_days is de gevraagde maximale wachttijd in dagen. "binnen 4 weken" is 28,
  "binnen een maand" is 30, "deze week" is 7. Geen deadline genoemd is null.
- within_norm is true als om de treeknorm gevraagd wordt in plaats van om een
  aantal dagen, anders false. De norm hangt van de behandeling af, dus reken die
  zelf niet uit.
- Geef geen uitleg, geen advies en geen medische informatie. Alleen de JSON.

Behandelingen (sleutel = naam):
"""


@dataclass(frozen=True)
class Question:
    """What the assistant understood. Shown back to the user so a mistake is visible."""

    treatment_key: str | None
    city: str | None
    max_days: int | None
    """Set when the question asked for the treeknorm rather than a number of days.
    The norm depends on the treatment, so it is resolved once that is known."""
    within_norm: bool
    source: str


def use_mock() -> bool:
    return (
        os.environ.get("WACHTTIJD_LLM_MOCK", "").lower() == "true"
        or not os.environ.get("GROQ_API_KEY")
    )


def parse(question: str, treatments: list[dict], cities: list[str]) -> Question:
    """Read a question. Falls back to rules when the model is unavailable."""
    if use_mock():
        return parse_with_rules(question, treatments, cities)
    try:
        return parse_with_groq(question, treatments)
    except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError):
        # A question half-understood beats an error page, and the parse is shown back
        # to the user either way.
        return parse_with_rules(question, treatments, cities)


def parse_with_groq(question: str, treatments: list[dict]) -> Question:
    catalogue = "\n".join(f'{t["treatment_key"]} = {t["treatment"]}' for t in treatments)
    response = httpx.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"},
        json={
            "model": GROQ_MODEL,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT + catalogue},
                {"role": "user", "content": question},
            ],
        },
        timeout=20.0,
    )
    response.raise_for_status()
    parsed = json.loads(response.json()["choices"][0]["message"]["content"])
    keys = {t["treatment_key"] for t in treatments}
    key = parsed.get("treatment_key")
    return Question(
        treatment_key=key if key in keys else None,
        city=parsed.get("city") or None,
        max_days=_positive_int(parsed.get("max_days")),
        within_norm=bool(parsed.get("within_norm")),
        source="groq",
    )


UNITS = {"dag": 1, "dagen": 1, "week": 7, "weken": 7, "maand": 30, "maanden": 30}
STOPWORDS = {
    "ik", "wil", "een", "de", "het", "in", "voor", "met", "van", "op", "en", "of",
    "binnen", "week", "weken", "dag", "dagen", "maand", "maanden", "afspraak",
    "wachttijd", "wachttijden", "zoek", "waar", "kan", "terecht", "graag", "mijn",
    # Words that appear in dozens of treatment names carry no signal, and through the
    # compound rule below they actively mislead: without this, "staaroperatie" matches
    # "Aortocoronaire bypass-operatie".
    "operatie", "operatieve", "behandeling", "behandelingen", "onderzoek", "initiele",
    "initiële", "totale", "verrichting", "zelfstandige", "algemeen", "overige",
    "diagnostiek", "consult", "als", "bij", "aan", "naar", "niet",
}


def parse_with_rules(question: str, treatments: list[dict], cities: list[str]) -> Question:
    """The same parse without a model. Good enough to demo, and never a surprise."""
    lowered = question.lower()
    return Question(
        treatment_key=_match_treatment(lowered, treatments),
        city=_match_city(lowered, cities),
        max_days=_match_deadline(lowered),
        within_norm="treeknorm" in lowered,
        source="rules",
    )


def _match_city(lowered: str, cities: list[str]) -> str | None:
    """Cities arrive longest first, so a longer name wins over one contained in it."""
    for city in cities:
        if re.search(rf"\b{re.escape(city.lower())}\b", lowered):
            return city
    return None


def _match_deadline(lowered: str) -> int | None:
    match = re.search(r"binnen\s+(\d+)\s*(dag|dagen|week|weken|maand|maanden)", lowered)
    if match:
        return int(match.group(1)) * UNITS[match.group(2)]
    if re.search(r"binnen\s+een\s+maand", lowered):
        return 30
    if re.search(r"binnen\s+een\s+week", lowered):
        return 7
    return None


def _match_treatment(lowered: str, treatments: list[dict]) -> str | None:
    """The treatment whose name shares the most meaningful words with the question.

    Dutch compounds, so a word counts when it is contained in one of the other's
    words as well as when it matches outright: "staaroperatie" has to find "staar",
    and "knieoperatie" has to find "knie". Four characters is the floor, or short
    fragments match everything.
    """
    asked = {word for word in re.findall(r"[a-zà-ÿ]+", lowered) if word not in STOPWORDS}
    best, best_score = None, 0
    for treatment in treatments:
        words = set(re.findall(r"[a-zà-ÿ]+", treatment["treatment"].lower())) - STOPWORDS
        score = sum(_weigh(word, asked) for word in words)
        if score > best_score:
            best, best_score = treatment["treatment_key"], score
    return best


def _weigh(word: str, asked: set[str]) -> int:
    """An exact word beats a compound, so "staaroperatie" prefers the staar treatment
    over anything that merely ends in the same syllables."""
    if word in asked:
        return 2
    if len(word) < 4:
        return 0
    return 1 if any(len(o) >= 4 and (word in o or o in word) for o in asked) else 0


def _positive_int(value: object) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(value) if value > 0 else None

"""The real source: the NZa Zorgbeeld open API.

Medisch-specialistische zorg only, national, unauthenticated, refreshed biweekly.
There is no ggz endpoint - see NOTES.md.
"""

import json
from pathlib import Path

import httpx

from .base import Wachttijd, now_iso

API_URL = "https://zorgbeeld.nza.nl/openapi/WaitingTimeMSZ"
USER_AGENT = (
    "wachttijd-radar/0.1 (portfolio project; "
    "+https://github.com/HubbersBI/wachttijd-radar)"
)
CACHE_PATH = Path(__file__).resolve().parents[3] / "db" / "cache" / "nza_msz.json"


class NzaSource:
    """Fetches from the NZa API, caching the raw response to disk.

    Development reads the cache. The API is only called when the cache is missing or
    `refresh=True` is passed explicitly - it is a public service, not a loop target.
    """

    name = "nza"

    def __init__(self, cache_path: Path = CACHE_PATH):
        self.cache_path = cache_path

    def fetch(self, refresh: bool = False) -> list[Wachttijd]:
        snapshot = self._load_cache() if not refresh else None
        if snapshot is None:
            snapshot = self._download()
            self._save_cache(snapshot)
        return [normalise(raw, snapshot["fetched_at"]) for raw in snapshot["records"]]

    def _download(self) -> dict:
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        response = httpx.get(API_URL, headers=headers, timeout=120.0)
        response.raise_for_status()
        return {"fetched_at": now_iso(), "source": self.name, "records": response.json()}

    def _load_cache(self) -> dict | None:
        if not self.cache_path.exists():
            return None
        return json.loads(self.cache_path.read_text(encoding="utf-8"))

    def _save_cache(self, snapshot: dict) -> None:
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self.cache_path.write_text(json.dumps(snapshot), encoding="utf-8")


def normalise(raw: dict, fetched_at: str) -> Wachttijd:
    """Map one API record onto our shape. Normalisation happens here, once, on write."""
    insufficient = raw["InsufficientObservations"] == "Ja"
    return Wachttijd(
        location_key=raw["LocationKey"],
        kvk_number=raw["KVKNumber"],
        care_provider=raw["CareProvider"],
        location=raw["Location"],
        postal_code=raw.get("PostalCode"),
        city=raw.get("City"),
        treatment_key=raw["TreatmentKey"],
        treatment=raw["Treatment"],
        treatment_type=raw["TreatmentType"],
        specialism=raw.get("Specialism"),
        days=None if insufficient else raw.get("WaitingTime"),
        insufficient_observations=insufficient,
        supplied_at=raw["Date"],
        fetched_at=fetched_at,
    )

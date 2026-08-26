"""Synthetic source for offline demo and tests.

A convenience, not a fallback. If the real adapter breaks the app says the data is
stale - it never quietly serves invented numbers as if they were reported.

Unlike the NZa API, which only ever returns now, this generates a run of weekly
reports so the trend view has something to draw offline.
"""

import random
from datetime import UTC, datetime, timedelta

from .base import TREATMENT_TYPES, Wachttijd, now_iso

PROVIDERS = [
    ("Sint Voorbeeld Ziekenhuis", "Utrecht", "3511AA"),
    ("Demokliniek Noord", "Groningen", "9711AA"),
    ("Regionaal Medisch Centrum", "Eindhoven", "5611AA"),
    ("Stadskliniek West", "Amsterdam", "1011AA"),
]
TREATMENTS = [
    ("Initiele totale knie vervanging (orthopedie)", "Orthopedie (305)"),
    ("Operatieve behandeling staar (oogheelkunde)", "Oogheelkunde (301)"),
    ("Orthopedie - Heupklachten", "Orthopedie (305)"),
    ("MRI-onderzoek", "Radiologie (362)"),
]


class SyntheticSource:
    """Deterministic by default, so tests and demos are reproducible."""

    name = "synthetic"

    def __init__(self, seed: int = 20260826, reports: int = 8):
        self.seed = seed
        self.reports = reports

    def fetch(self, refresh: bool = False) -> list[Wachttijd]:
        rng = random.Random(self.seed)
        fetched_at = now_iso()
        today = datetime.now(UTC)
        rows = []

        for provider_index, (provider, city, postcode) in enumerate(PROVIDERS):
            for treatment_index, (treatment, specialism) in enumerate(TREATMENTS):
                treatment_type = TREATMENT_TYPES[treatment_index % len(TREATMENT_TYPES)]
                wait = rng.randint(10, 120)
                drift = rng.choice((-6, -3, 2, 5, 9))

                # Oldest report first, so the wait drifts towards the current figure.
                for week in range(self.reports - 1, -1, -1):
                    wait = max(0, wait + drift + rng.randint(-4, 4))
                    insufficient = rng.random() < 0.08
                    supplied_at = (today - timedelta(weeks=week)).isoformat(timespec="seconds")
                    rows.append(
                        Wachttijd(
                            location_key=f"synthetic-loc-{provider_index}",
                            kvk_number=f"9000000{provider_index}",
                            care_provider=provider,
                            location=f"{provider} ({city})",
                            postal_code=postcode,
                            city=city,
                            treatment_key=f"synthetic-tr-{treatment_index}",
                            treatment=treatment,
                            treatment_type=treatment_type,
                            specialism=specialism,
                            days=None if insufficient else wait,
                            insufficient_observations=insufficient,
                            supplied_at=supplied_at,
                            fetched_at=fetched_at,
                        )
                    )
        return rows

"""The shape of one waiting-time observation, and the interface every source implements."""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

TREATMENT_TYPES = ("Polikliniekbezoek", "Behandeling", "Diagnostiek")


@dataclass(frozen=True)
class Wachttijd:
    """One reported wait, at one location, for one treatment.

    `days` is None when the source reported insufficient observations. That absence
    is meaningful and must survive to the UI - never fill it with a zero or a mean.

    `supplied_at` is when the provider reported the figure; `fetched_at` is when we
    pulled it. Both are needed to show the number honestly.
    """

    location_key: str
    kvk_number: str
    care_provider: str
    location: str
    postal_code: str | None
    city: str | None
    treatment_key: str
    treatment: str
    treatment_type: str
    specialism: str | None
    days: int | None
    insufficient_observations: bool
    supplied_at: str
    fetched_at: str


class WachttijdSource(Protocol):
    """One interface, two implementations: the real NZa adapter and a synthetic generator."""

    name: str

    def fetch(self) -> list[Wachttijd]:
        ...


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")

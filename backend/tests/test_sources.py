"""The invariants, as tests. These are the rules from CLAUDE.md that code can break."""

import os

from app.sources import SyntheticSource, create_source
from app.sources.nza import normalise

RAW = {
    "Date": "2026-08-18T08:00:00.000Z",
    "WaitingTime": 68,
    "InsufficientObservations": "Nee",
    "KVKNumber": "30051620",
    "CareProvider": "Diakonessenhuis",
    "LocationKey": "abc",
    "Location": "Diakonessenhuis Utrecht",
    "PostalCode": "3582KE",
    "City": "Utrecht",
    "TreatmentKey": "def",
    "Treatment": "Initiele totale knie vervanging (orthopedie)",
    "TreatmentType": "Behandeling",
    "Specialism": "Orthopedie (305)",
}


def test_normalise_keeps_both_dates_apart():
    row = normalise(RAW, fetched_at="2026-08-26T09:00:00+00:00")
    assert row.supplied_at == "2026-08-18T08:00:00.000Z"
    assert row.fetched_at == "2026-08-26T09:00:00+00:00"


def test_days_is_none_when_observations_insufficient():
    raw = RAW | {"InsufficientObservations": "Ja"}
    raw.pop("WaitingTime")
    row = normalise(raw, fetched_at="2026-08-26T09:00:00+00:00")
    assert row.days is None
    assert row.insufficient_observations is True


def test_insufficient_never_carries_a_number():
    """Even if the source sends a figure alongside the flag, we do not show it."""
    raw = RAW | {"InsufficientObservations": "Ja", "WaitingTime": 68}
    assert normalise(raw, fetched_at="x").days is None


def test_synthetic_is_deterministic():
    assert SyntheticSource().fetch() == SyntheticSource().fetch()


def test_factory_honours_the_environment_variable():
    os.environ["WACHTTIJD_SOURCE"] = "synthetic"
    assert create_source().name == "synthetic"
    del os.environ["WACHTTIJD_SOURCE"]
    assert create_source().name == "nza"

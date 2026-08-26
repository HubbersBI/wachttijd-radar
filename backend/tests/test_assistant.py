"""Reading a question. Runs on rules, so the suite needs no key, quota or network."""

import pytest

from app.assistant import parse_with_rules
from app.sources import SyntheticSource
from app.store import connect, store

CITIES = ["Bergen op Zoom", "Amsterdam", "Groningen", "Eindhoven", "Rotterdam", "Utrecht", "Bergen"]


@pytest.fixture
def treatments(tmp_path):
    from app.queries import treatments as read_treatments

    conn = connect(tmp_path / "assistant.sqlite")
    store(conn, SyntheticSource().fetch())
    return read_treatments(conn)


def test_reads_a_deadline_in_weeks(treatments):
    assert parse_with_rules("binnen 4 weken", treatments, CITIES).max_days == 28


def test_reads_a_deadline_in_days_and_months(treatments):
    assert parse_with_rules("binnen 10 dagen", treatments, CITIES).max_days == 10
    assert parse_with_rules("binnen 2 maanden", treatments, CITIES).max_days == 60
    assert parse_with_rules("binnen een maand", treatments, CITIES).max_days == 30


def test_no_deadline_is_no_deadline(treatments):
    assert parse_with_rules("staar in Utrecht", treatments, CITIES).max_days is None


def test_asking_for_the_treeknorm_is_flagged_not_guessed(treatments):
    """The norm depends on the treatment, so the parse must not invent a number."""
    read = parse_with_rules("staar binnen de treeknorm", treatments, CITIES)
    assert read.within_norm is True
    assert read.max_days is None


def test_finds_the_city(treatments):
    assert parse_with_rules("staar in Groningen", treatments, CITIES).city == "Groningen"


def test_prefers_the_longer_city_name(treatments):
    """Otherwise "Bergen op Zoom" is read as "Bergen"."""
    assert parse_with_rules("MRI in Bergen op Zoom", treatments, CITIES).city == "Bergen op Zoom"


def test_a_city_that_is_not_mentioned_is_not_invented(treatments):
    assert parse_with_rules("staaroperatie binnen 3 weken", treatments, CITIES).city is None


def test_maps_a_lay_term_onto_the_official_name(treatments):
    read = parse_with_rules("ik wil een staaroperatie", treatments, CITIES)
    match = next(t for t in treatments if t["treatment_key"] == read.treatment_key)
    assert "staar" in match["treatment"].lower()


def test_reads_a_whole_question(treatments):
    read = parse_with_rules(
        "Ik wil een afspraak binnen 4 weken in Rotterdam voor een knie vervanging",
        treatments,
        CITIES,
    )
    match = next(t for t in treatments if t["treatment_key"] == read.treatment_key)
    assert "knie" in match["treatment"].lower()
    assert read.city == "Rotterdam"
    assert read.max_days == 28

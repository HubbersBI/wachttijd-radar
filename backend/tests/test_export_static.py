"""The serverless build. What is written must be what /api would have answered."""

import json

import pytest

from app import export_static, main, queries
from app.sources import SyntheticSource
from app.store import connect, store


@pytest.fixture
def written(tmp_path, monkeypatch):
    db = tmp_path / "export.sqlite"
    conn = connect(db)
    store(conn, SyntheticSource().fetch())
    conn.close()
    monkeypatch.setenv("WACHTTIJD_DB", str(db))

    out = tmp_path / "api"
    export_static.write_all(out)
    return out, db


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def as_served(payload):
    """What the browser receives, rather than what Python is holding.

    `norm_days` is a tuple in memory and an array over the wire, on both routes. The
    comparison that matters is between what arrives, so both sides round-trip.
    """
    return json.loads(json.dumps(payload))


def test_writes_the_files_the_frontend_asks_for(written):
    out, _ = written
    assert (out / "health.json").is_file()
    assert (out / "treatments.json").is_file()
    assert (out / "cities.json").is_file()
    assert list((out / "wachttijden").glob("*.json"))


def test_a_treatment_file_is_what_the_endpoint_would_have_answered(written):
    """The whole point. If these ever differ, the static site is lying about a wait."""
    out, db = written
    conn = connect(db)
    try:
        for treatment in queries.treatments(conn):
            key = treatment["treatment_key"]
            rows = queries.wachttijden(conn, key)
            live = main._answer(rows, key, None, None)
            assert read(out / "wachttijden" / f"{key}.json") == as_served(live)
    finally:
        conn.close()


def test_every_treatment_in_the_picker_has_a_file_behind_it(written):
    """A treatment offered in the list but missing its file is a dead option."""
    out, _ = written
    for treatment in read(out / "treatments.json")["treatments"]:
        assert (out / "wachttijden" / f"{treatment['treatment_key']}.json").is_file()


def test_a_wait_keeps_both_its_dates_and_its_flag(written):
    """The invariant that survives every route to the screen: no figure without its
    source and both its dates, and no invented number where the source had none."""
    out, _ = written
    key = read(out / "treatments.json")["treatments"][0]["treatment_key"]
    for row in read(out / "wachttijden" / f"{key}.json")["results"]:
        assert row["supplied_at"] and row["fetched_at"]
        assert row["days"] is not None or row["insufficient_observations"]


def test_previous_output_is_cleared(written):
    """A treatment that leaves the source must not go on being served."""
    out, _ = written
    stale = out / "wachttijden" / "gone.json"
    stale.write_text("{}", encoding="utf-8")
    export_static.write_all(out)
    assert not stale.exists()

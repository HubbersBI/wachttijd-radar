"""API behaviour. Every row must reach the client with its dates and its flag."""

import pytest
from fastapi.testclient import TestClient

from app.main import app, get_conn
from app.sources import SyntheticSource
from app.store import connect, store


@pytest.fixture
def client(tmp_path):
    """A connection per request, as in production - SQLite objects are thread-bound."""
    db_path = tmp_path / "api.sqlite"
    seed = connect(db_path)
    store(seed, SyntheticSource().fetch())
    seed.close()

    def override():
        conn = connect(db_path)
        try:
            yield conn
        finally:
            conn.close()

    app.dependency_overrides[get_conn] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_health_reports_freshness(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["rows"] > 0
    assert body["fetched_at"]


def test_treatments_are_listed_once_per_key(client):
    treatments = client.get("/api/treatments").json()["treatments"]
    keys = [t["treatment_key"] for t in treatments]
    assert keys == sorted(set(keys), key=keys.index)


def test_every_row_carries_its_dates_and_flag(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get("/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}).json()
    assert body["results"]
    for row in body["results"]:
        assert row["supplied_at"] and row["fetched_at"]
        assert "insufficient_observations" in row
        assert row["treatment_type"]


def test_rows_without_a_number_are_kept_and_sorted_last(client):
    """The absence of a wait is part of the picture - it must not be dropped."""
    for treatment in client.get("/api/treatments").json()["treatments"]:
        rows = client.get(
            "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
        ).json()["results"]
        waits = [row["days"] for row in rows]
        assert waits == sorted(waits, key=lambda d: (d is None, d))
        for row in rows:
            assert row["insufficient_observations"] == (row["days"] is None)


def test_unknown_treatment_is_a_404(client):
    assert client.get("/api/wachttijden", params={"treatment_key": "nope"}).status_code == 404


def test_each_row_carries_its_own_history(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
    ).json()
    for row in body["results"]:
        assert len(row["history"]) > 1, "the synthetic source reports a run, not a point"
        dates = [point["supplied_at"] for point in row["history"]]
        assert dates == sorted(dates), "history is oldest first"


def test_the_latest_history_point_is_the_reported_wait(client):
    """The row and the end of its own history cannot disagree."""
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
    ).json()
    for row in body["results"]:
        assert row["history"][-1]["days"] == row["days"]
        assert row["history"][-1]["supplied_at"] == row["supplied_at"]

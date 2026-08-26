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


def test_every_row_carries_its_norm_and_verdict(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
    ).json()
    assert body["norm_days"], "the response states the norm the list is judged against"
    assert "TH/BR-025" in body["norm_source"]
    for row in body["results"]:
        assert row["norm_days"] == body["norm_days"]
        if row["days"] is None:
            assert row["norm_verdict"] is None, "no verdict without a number"
        else:
            assert row["norm_verdict"] in {"within", "exceeded", "depends"}


def test_a_row_without_a_number_never_gets_a_verdict(client):
    """Judging a wait we do not have would be worse than showing no verdict."""
    for treatment in client.get("/api/treatments").json()["treatments"]:
        rows = client.get(
            "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
        ).json()["results"]
        for row in rows:
            assert (row["norm_verdict"] is None) == (row["days"] is None)


def test_treatments_carry_the_norm_they_are_judged_against(client):
    """So a request drafted from someone's own appointment uses the same norms."""
    for treatment in client.get("/api/treatments").json()["treatments"]:
        assert treatment["norm_days"], treatment["treatment"]
        strict, lenient = treatment["norm_days"]
        assert strict <= lenient


def test_health_says_how_much_is_covered(client):
    """The page shows these; a tool that states its coverage is easier to trust."""
    body = client.get("/api/health").json()
    for field in ("rows", "providers", "locations", "treatments"):
        assert body[field] > 0, field
    assert body["locations"] >= body["providers"]


def test_max_days_keeps_only_locations_that_meet_the_deadline(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    params = {"treatment_key": treatment["treatment_key"], "max_days": 30}
    body = client.get("/api/wachttijden", params=params).json()
    assert body["max_days"] == 30
    assert body["results"], "the synthetic source has waits under 30 days"
    for row in body["results"]:
        assert row["days"] is not None and row["days"] <= 30


def test_a_location_without_a_figure_is_counted_not_dropped(client):
    """It cannot be said to meet a deadline, but the answer must not hide it."""
    treatment = client.get("/api/treatments").json()["treatments"][0]
    key = treatment["treatment_key"]
    everything = client.get("/api/wachttijden", params={"treatment_key": key}).json()
    missing = sum(1 for row in everything["results"] if row["days"] is None)

    filtered = client.get(
        "/api/wachttijden", params={"treatment_key": key, "max_days": 30}
    ).json()
    assert filtered["unreported"] == missing
    assert filtered["considered"] == everything["count"]


def test_without_max_days_nothing_is_filtered(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"]}
    ).json()
    assert body["max_days"] is None
    assert body["count"] == body["considered"]
    assert body["unreported"] == 0


def test_an_impossible_deadline_returns_nothing_rather_than_the_nearest_thing(client):
    """And still says which treatment it found nothing for."""
    treatment = client.get("/api/treatments").json()["treatments"][0]
    body = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"], "max_days": 0}
    ).json()
    assert body["results"] == []
    assert body["treatment"] == treatment["treatment"]
    assert body["considered"] > 0


def test_a_negative_deadline_is_rejected(client):
    treatment = client.get("/api/treatments").json()["treatments"][0]
    response = client.get(
        "/api/wachttijden", params={"treatment_key": treatment["treatment_key"], "max_days": -5}
    )
    assert response.status_code == 422

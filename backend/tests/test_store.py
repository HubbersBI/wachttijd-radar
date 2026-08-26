"""Storage behaviour: re-fetching is a no-op, a new report is a new row."""

from app.sources import SyntheticSource
from app.store import connect, store


def test_storing_twice_adds_nothing(tmp_path):
    conn = connect(tmp_path / "test.sqlite")
    rows = SyntheticSource().fetch()
    assert store(conn, rows) == len(rows)
    assert store(conn, rows) == 0


def test_a_new_report_date_is_a_new_row(tmp_path):
    conn = connect(tmp_path / "test.sqlite")
    rows = SyntheticSource().fetch()
    store(conn, rows)
    later = [type(row)(**{**row.__dict__, "supplied_at": "2026-09-01T00:00:00Z"}) for row in rows]
    assert store(conn, later) == len(rows)


def test_insufficient_rows_are_stored_with_a_null_wait(tmp_path):
    conn = connect(tmp_path / "test.sqlite")
    store(conn, SyntheticSource().fetch())
    flagged = conn.execute(
        "SELECT days FROM wachttijd WHERE insufficient_observations = 1"
    ).fetchall()
    assert flagged and all(row["days"] is None for row in flagged)

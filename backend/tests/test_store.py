"""Storage behaviour: re-fetching is a no-op, a new report is a new row."""

from app.sources import SyntheticSource
from app.store import connect, store


def test_storing_twice_adds_nothing(tmp_path):
    conn = connect(tmp_path / "test.sqlite")
    rows = SyntheticSource().fetch()
    assert store(conn, rows) == len(rows)
    assert store(conn, rows) == 0


def test_a_new_report_date_is_a_new_row(tmp_path):
    """Each row keeps its own date, shifted - collapsing them all onto one date
    would merge the reports that make up a history."""
    conn = connect(tmp_path / "test.sqlite")
    rows = SyntheticSource().fetch()
    store(conn, rows)
    later = [
        type(row)(**{**row.__dict__, "supplied_at": row.supplied_at + "-later"}) for row in rows
    ]
    assert store(conn, later) == len(rows)


def test_the_synthetic_source_reports_a_history(tmp_path):
    """One report per location is a point, not a trend. The demo needs a run."""
    rows = SyntheticSource(reports=8).fetch()
    dates = {(row.location_key, row.treatment_key): set() for row in rows}
    for row in rows:
        dates[(row.location_key, row.treatment_key)].add(row.supplied_at)
    assert all(len(seen) == 8 for seen in dates.values())


def test_insufficient_rows_are_stored_with_a_null_wait(tmp_path):
    conn = connect(tmp_path / "test.sqlite")
    store(conn, SyntheticSource().fetch())
    flagged = conn.execute(
        "SELECT days FROM wachttijd WHERE insufficient_observations = 1"
    ).fetchall()
    assert flagged and all(row["days"] is None for row in flagged)


def test_a_connection_survives_being_closed_on_another_thread(tmp_path):
    """FastAPI opens a generator dependency on one thread and closes it on another."""
    import threading

    conn = connect(tmp_path / "threads.sqlite")
    store(conn, SyntheticSource().fetch())
    error: list[Exception] = []

    def close_it():
        try:
            conn.execute("SELECT COUNT(*) FROM wachttijd").fetchone()
            conn.close()
        except Exception as exc:  # noqa: BLE001 - the failure is the assertion
            error.append(exc)

    thread = threading.Thread(target=close_it)
    thread.start()
    thread.join()
    assert not error, error[0]


def test_synthetic_rows_never_share_a_database_with_reported_ones(monkeypatch):
    """Once mixed, an invented number is indistinguishable from a reported one."""
    from app.store import default_db_path

    monkeypatch.setenv("WACHTTIJD_SOURCE", "nza")
    real = default_db_path()
    monkeypatch.setenv("WACHTTIJD_SOURCE", "synthetic")
    synthetic = default_db_path()
    assert real != synthetic


def test_an_explicit_database_path_wins(monkeypatch, tmp_path):
    from app.store import default_db_path

    monkeypatch.setenv("WACHTTIJD_DB", str(tmp_path / "chosen.sqlite"))
    assert default_db_path() == tmp_path / "chosen.sqlite"

"""SQLite storage. One denormalised table; snapshots accumulate.

Normalisation happens on write, never in the read path.
"""

import os
import sqlite3
from pathlib import Path

from .sources.base import Wachttijd

# WACHTTIJD_DB_DIR is the mounted volume in the container; a checkout uses db/.
DB_DIR = Path(
    os.environ.get("WACHTTIJD_DB_DIR", Path(__file__).resolve().parents[2] / "db")
)


def default_db_path() -> Path:
    """Where the database lives.

    Each source gets its own file. Synthetic rows must never land in the same table
    as reported ones: once mixed there is no way to tell an invented number from a
    number a hospital actually filed.

    WACHTTIJD_DB overrides the whole path; WACHTTIJD_DB_DIR overrides the directory
    while keeping the per-source filename.
    """
    override = os.environ.get("WACHTTIJD_DB")
    if override:
        return Path(override)
    directory = Path(os.environ.get("WACHTTIJD_DB_DIR", DB_DIR))
    synthetic = os.environ.get("WACHTTIJD_SOURCE", "nza").lower() == "synthetic"
    return directory / ("synthetic.sqlite" if synthetic else "wachttijden.sqlite")


DB_PATH = default_db_path()

SCHEMA = """
CREATE TABLE IF NOT EXISTS wachttijd (
  location_key              TEXT    NOT NULL,
  kvk_number                TEXT    NOT NULL,
  care_provider             TEXT    NOT NULL,
  location                  TEXT    NOT NULL,
  postal_code               TEXT,
  city                      TEXT,
  treatment_key             TEXT    NOT NULL,
  treatment                 TEXT    NOT NULL,
  treatment_type            TEXT    NOT NULL,
  specialism                TEXT,
  days                      INTEGER,
  insufficient_observations INTEGER NOT NULL,
  supplied_at               TEXT    NOT NULL,
  fetched_at                TEXT    NOT NULL,
  UNIQUE (location_key, treatment_key, supplied_at)
);
CREATE INDEX IF NOT EXISTS idx_treatment ON wachttijd (treatment_key);
CREATE INDEX IF NOT EXISTS idx_city ON wachttijd (city);
"""

COLUMNS = (
    "location_key", "kvk_number", "care_provider", "location", "postal_code", "city",
    "treatment_key", "treatment", "treatment_type", "specialism", "days",
    "insufficient_observations", "supplied_at", "fetched_at",
)


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    """Open a connection. One per request; never shared between concurrent requests.

    `check_same_thread=False` is needed because FastAPI opens a generator dependency
    on one threadpool thread and closes it on another. The connection is still only
    ever used by one request at a time.
    """
    db_path = db_path or default_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def store(conn: sqlite3.Connection, rows: list[Wachttijd]) -> int:
    """Insert rows, ignoring ones already held. Returns how many were new.

    Re-fetching the same reported figure is a no-op; a new report is a new row. That
    is what makes the table a history rather than a snapshot.
    """
    placeholders = ", ".join("?" * len(COLUMNS))
    sql = f"INSERT OR IGNORE INTO wachttijd ({', '.join(COLUMNS)}) VALUES ({placeholders})"
    before = conn.total_changes
    conn.executemany(sql, [_as_tuple(row) for row in rows])
    conn.commit()
    return conn.total_changes - before


def _as_tuple(row: Wachttijd) -> tuple:
    values = []
    for column in COLUMNS:
        value = getattr(row, column)
        values.append(int(value) if isinstance(value, bool) else value)
    return tuple(values)

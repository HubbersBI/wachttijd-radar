"""Reads. Normalisation already happened on write, so these only select and order.

Every query resolves to the *latest* report per location and treatment. The table is
a history - without that, an accumulating table would show the same provider several
times, once per report.
"""

import sqlite3

LATEST_PER_LOCATION = """
SELECT location_key, care_provider, location, postal_code, city,
       treatment_key, treatment, treatment_type, specialism,
       days, insufficient_observations, supplied_at, fetched_at,
       ROW_NUMBER() OVER (
         PARTITION BY location_key, treatment_key ORDER BY supplied_at DESC
       ) AS rn
FROM wachttijd
WHERE treatment_key = ?
"""

HISTORY = """
SELECT location_key, days, insufficient_observations, supplied_at
FROM wachttijd
WHERE treatment_key = ?
ORDER BY location_key, supplied_at
"""

TREATMENTS = """
WITH named AS (
  SELECT treatment_key, treatment, specialism, treatment_type,
         ROW_NUMBER() OVER (PARTITION BY treatment_key ORDER BY supplied_at DESC) AS rn
  FROM wachttijd
),
counts AS (
  SELECT treatment_key, COUNT(DISTINCT location_key) AS location_count
  FROM wachttijd GROUP BY treatment_key
)
SELECT n.treatment_key, n.treatment, n.specialism, n.treatment_type, c.location_count
FROM named n JOIN counts c ON c.treatment_key = n.treatment_key
WHERE n.rn = 1
ORDER BY n.treatment
"""


def treatments(conn: sqlite3.Connection) -> list[dict]:
    """One entry per treatment_key, labelled with its most recently reported name.

    Four keys carry more than one name because the label was revised. The key is the
    identity; grouping by name would split one treatment across two lists and hide
    providers from the comparison.
    """
    return [dict(row) for row in conn.execute(TREATMENTS)]


def wachttijden(conn: sqlite3.Connection, treatment_key: str, city: str | None = None) -> list[dict]:
    """Providers for one treatment, shortest wait first.

    Rows with insufficient observations sort last but are never dropped - the absence
    of a number is part of the picture.
    """
    sql = f"SELECT * FROM ({LATEST_PER_LOCATION}) WHERE rn = 1"
    params: list = [treatment_key]
    if city:
        sql += " AND city = ? COLLATE NOCASE"
        params.append(city)
    sql += " ORDER BY days IS NULL, days"
    rows = [_row(row) for row in conn.execute(sql, params)]

    past = history(conn, treatment_key)
    for row in rows:
        row["history"] = past.get(row["location_key"], [])
    return rows


def history(conn: sqlite3.Connection, treatment_key: str) -> dict[str, list[dict]]:
    """Every report per location for one treatment, oldest first.

    The table already holds one row per report; this is what those rows were for. A
    location with a single report has a one-point history and no trend - the UI must
    not imply movement where none has been observed.
    """
    grouped: dict[str, list[dict]] = {}
    for row in conn.execute(HISTORY, (treatment_key,)):
        grouped.setdefault(row["location_key"], []).append(
            {
                "days": row["days"],
                "insufficient_observations": bool(row["insufficient_observations"]),
                "supplied_at": row["supplied_at"],
            }
        )
    return grouped


def _row(row: sqlite3.Row) -> dict:
    out = dict(row)
    out.pop("rn", None)
    out["insufficient_observations"] = bool(out["insufficient_observations"])
    return out


def data_freshness(conn: sqlite3.Connection) -> dict:
    """When the data was last pulled, and the newest report in it."""
    row = conn.execute(
        "SELECT MAX(fetched_at) AS fetched_at, MAX(supplied_at) AS supplied_at,"
        " COUNT(*) AS rows FROM wachttijd"
    ).fetchone()
    return dict(row)

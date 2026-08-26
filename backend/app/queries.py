"""Reads. Normalisation already happened on write, so these only select and order.

Every query resolves to the *latest* report per location and treatment. The table is
a history - without that, an accumulating table would show the same provider several
times, once per report.
"""

import sqlite3

from . import treeknorm

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
    out = []
    for row in conn.execute(TREATMENTS):
        entry = dict(row)
        # Carried here so anyone drafting a request against their own appointment can
        # judge it without a second round trip, and against the same norms as the list.
        entry["norm_days"] = treeknorm.norm_for(entry["treatment_type"])
        out.append(entry)
    return out


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
    return [_row(row) for row in conn.execute(sql, params)]


def _row(row: sqlite3.Row) -> dict:
    out = dict(row)
    out.pop("rn", None)
    out["insufficient_observations"] = bool(out["insufficient_observations"])
    out["norm_days"] = treeknorm.norm_for(out["treatment_type"])
    out["norm_verdict"] = treeknorm.verdict(out["treatment_type"], out["days"])
    return out


def cities(conn: sqlite3.Connection) -> list[str]:
    """Every city with a reported location, longest name first.

    Longest first so "Bergen op Zoom" is matched before "Bergen" when reading a
    question.
    """
    rows = conn.execute(
        "SELECT DISTINCT city FROM wachttijd WHERE city IS NOT NULL ORDER BY LENGTH(city) DESC"
    )
    return [row["city"] for row in rows]


def data_freshness(conn: sqlite3.Connection) -> dict:
    """What the database holds and when it was pulled.

    The counts are shown on the page. A tool that says how much it covers is easier
    to trust than one that just asserts it is complete.
    """
    row = conn.execute(
        "SELECT MAX(fetched_at) AS fetched_at, MAX(supplied_at) AS supplied_at,"
        " COUNT(*) AS rows,"
        " COUNT(DISTINCT kvk_number) AS providers,"
        " COUNT(DISTINCT location_key) AS locations,"
        " COUNT(DISTINCT treatment_key) AS treatments"
        " FROM wachttijd"
    ).fetchone()
    return dict(row)

"""Fetch waiting times and store them.

    uv run -m app.fetch            # from the cached snapshot
    uv run -m app.fetch --refresh  # call the NZa API
"""

import sys

from .sources import create_source
from .store import connect, store


def main() -> None:
    refresh = "--refresh" in sys.argv
    source = create_source()
    rows = source.fetch(refresh=refresh)
    conn = connect()
    new = store(conn, rows)
    total = conn.execute("SELECT COUNT(*) FROM wachttijd").fetchone()[0]
    print(f"[{source.name}] fetched {len(rows)} rows, {new} new, {total} in the database")


if __name__ == "__main__":
    main()

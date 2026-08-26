"""Fetch waiting times and store them.

    uv run -m app.fetch            # from the cached snapshot
    uv run -m app.fetch --refresh  # call the NZa API
    uv run -m app.fetch --seed     # fetch only if the database is empty
"""

import sys

import httpx

from .sources import create_source
from .store import connect, store


def main() -> None:
    argv = sys.argv[1:]
    conn = connect()
    rows_held = conn.execute("SELECT COUNT(*) FROM wachttijd").fetchone()[0]

    if "--seed" in argv and rows_held:
        print(f"database already holds {rows_held} rows, not seeding")
        return

    source = create_source()
    refresh = "--refresh" in argv or "--seed" in argv
    try:
        rows = source.fetch(refresh=refresh)
    except httpx.HTTPError as error:
        # A container should still start and report that it has no data, rather than
        # crash-looping. The app says the data is absent; it never invents numbers.
        if "--seed" not in argv:
            raise
        print(f"could not reach the source ({error}). Starting with an empty database.")
        return

    new = store(conn, rows)
    total = conn.execute("SELECT COUNT(*) FROM wachttijd").fetchone()[0]
    print(f"[{source.name}] fetched {len(rows)} rows, {new} new, {total} in the database")


if __name__ == "__main__":
    main()

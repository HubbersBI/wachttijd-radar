"""Write the API out as flat JSON files, so the app can be hosted with no server.

Every read endpoint answers the same thing between two fetches: the figures change
biweekly and the API only ever returns now. So a public deployment does not need a
running backend at all - it needs the answers, written once at build time.

The shapes here are not rebuilt. They come from the same `queries` and `main._answer`
that serve `/api`, so the static site and the live one cannot drift apart. If a figure
were assembled twice it would eventually be assembled two different ways.

    uv run python -m app.export_static --out ../frontend/public/api

Deadline and city filtering are left to the browser. Both are cheap over one
treatment's rows, and writing a file per city would multiply 113 files into thousands.
"""

import argparse
import json
import shutil
from pathlib import Path

from . import main, queries
from .store import connect


def write_all(out: Path) -> int:
    """Write every answer the frontend can ask for. Returns the number of files.

    Previous output is removed first. A treatment the source has stopped reporting
    would otherwise keep its file and go on being served after it left the data.
    """
    if out.exists():
        shutil.rmtree(out)
    (out / "wachttijden").mkdir(parents=True)

    conn = connect()
    try:
        found_treatments = queries.treatments(conn)
        _write(out / "health.json", main.health(conn))
        _write(out / "treatments.json", {"treatments": found_treatments})
        # Only the static build needs these: with no backend to read the question, the
        # rules parser runs in the browser and needs the same city list it does.
        _write(out / "cities.json", {"cities": queries.cities(conn)})

        written = 3
        for treatment in found_treatments:
            key = treatment["treatment_key"]
            rows = queries.wachttijden(conn, key)
            if not rows:
                continue
            # city and max_days are None: the whole treatment, filtered in the browser.
            _write(out / "wachttijden" / f"{key}.json", main._answer(rows, key, None, None))
            written += 1
        return written
    finally:
        conn.close()


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def main_cli() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "frontend" / "public" / "api",
        help="Directory to write into. Cleared of previous output first.",
    )
    args = parser.parse_args()
    count = write_all(args.out)
    print(f"Wrote {count} files to {args.out}")


if __name__ == "__main__":
    main_cli()

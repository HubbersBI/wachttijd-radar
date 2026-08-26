"""FastAPI app. Serves /api, and later the static frontend export on the same port."""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles

from . import queries
from .sources import create_source
from .store import connect, store

log = logging.getLogger("wachttijd")

# The source refreshes biweekly; a daily poll is ample and keeps the history filling
# even when nobody remembers to run a fetch. Set to 0 to disable.
REFRESH_HOURS = float(os.environ.get("WACHTTIJD_REFRESH_HOURS", "24"))

# The built frontend: `backend/static` in the image, `frontend/out` in a checkout.
FRONTEND = next(
    (
        path
        for path in (
            Path(__file__).resolve().parents[1] / "static",
            Path(__file__).resolve().parents[2] / "frontend" / "out",
        )
        if path.is_dir()
    ),
    None,
)

async def _refresh_forever() -> None:
    """Fetch on a slow loop so the table accumulates reports over time.

    Storing is a no-op until a provider files a new figure, so most passes insert
    nothing. That is the point: the rows that do land are the trend.
    """
    while True:
        await asyncio.sleep(REFRESH_HOURS * 3600)
        try:
            source = create_source()
            rows = await asyncio.to_thread(source.fetch, True)
        except httpx.HTTPError as error:
            # The next pass will try again. Stale data is reported as stale; it is
            # never replaced with an invented figure.
            log.warning("refresh failed, keeping the data we have: %s", error)
            continue
        conn = connect()
        try:
            log.info("refresh stored %d new reports", store(conn, rows))
        finally:
            conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_refresh_forever()) if REFRESH_HOURS > 0 else None
    yield
    if task:
        task.cancel()


app = FastAPI(title="Wachttijd-radar", version="0.1.0", lifespan=lifespan)


def get_conn():
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()


@app.get("/api/health")
def health(conn=Depends(get_conn)) -> dict:
    freshness = queries.data_freshness(conn)
    return {
        "status": "ok" if freshness["rows"] else "empty",
        "rows": freshness["rows"],
        "fetched_at": freshness["fetched_at"],
        "latest_report": freshness["supplied_at"],
        "source": "NZa Zorgbeeld open API (medisch-specialistische zorg)",
    }


@app.get("/api/treatments")
def treatments(conn=Depends(get_conn)) -> dict:
    return {"treatments": queries.treatments(conn)}


@app.get("/api/wachttijden")
def wachttijden(
    treatment_key: str = Query(..., description="Identity of the treatment, from /api/treatments"),
    city: str | None = Query(None, description="Optional city filter"),
    conn=Depends(get_conn),
) -> dict:
    results = queries.wachttijden(conn, treatment_key, city)
    if not results:
        raise HTTPException(status_code=404, detail="No waiting times for that treatment")
    return {
        "treatment_key": treatment_key,
        "treatment": results[0]["treatment"],
        "treatment_type": results[0]["treatment_type"],
        "city": city,
        "count": len(results),
        "source": "Nederlandse Zorgautoriteit (NZa)",
        "results": results,
    }


# The static frontend export, on the same port as /api. Mounted last so it never
# shadows an API route. Absent until `npm run build` has run.
if FRONTEND:
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")

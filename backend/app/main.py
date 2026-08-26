"""FastAPI app. Serves /api, and later the static frontend export on the same port."""

from fastapi import Depends, FastAPI, HTTPException, Query

from . import queries
from .store import connect

app = FastAPI(title="Wachttijd-radar", version="0.1.0")


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

"""FastAPI app. Serves /api, and later the static frontend export on the same port."""

from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import assistant, queries, treeknorm
from .store import connect

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
        "providers": freshness["providers"],
        "locations": freshness["locations"],
        "treatments": freshness["treatments"],
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
    max_days: int | None = Query(
        None, ge=0, description="Only locations reporting a wait of at most this many days"
    ),
    conn=Depends(get_conn),
) -> dict:
    found = queries.wachttijden(conn, treatment_key, city)
    if not found:
        raise HTTPException(status_code=404, detail="No waiting times for that treatment")
    return _answer(found, treatment_key, city, max_days)


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=2, max_length=300)


@app.post("/api/assistant")
def ask(body: AssistantQuestion, conn=Depends(get_conn)) -> dict:
    """Answer a question in plain Dutch with rows from the database.

    The model only picks the treatment, the city and the deadline; every figure in the
    answer is read from the table. The question is never logged or stored.
    """
    understood = assistant.parse(
        body.question, queries.treatments(conn), queries.cities(conn)
    )
    answer: dict = {
        "understood": {
            "treatment_key": understood.treatment_key,
            "city": understood.city,
            "max_days": understood.max_days,
            "within_norm": understood.within_norm,
            "read_by": understood.source,
        }
    }
    if not understood.treatment_key:
        answer["error"] = "Ik kon er geen behandeling in herkennen."
        return answer

    found = queries.wachttijden(conn, understood.treatment_key, understood.city)
    if not found:
        answer["error"] = (
            f"Geen locaties gevonden voor deze behandeling"
            f"{f' in {understood.city}' if understood.city else ''}."
        )
        return answer

    # "binnen de treeknorm" is a deadline too, but which one depends on the treatment,
    # so it can only be resolved now that the treatment is known.
    max_days = understood.max_days
    norm = treeknorm.norm_for(found[0]["treatment_type"])
    if max_days is None and understood.within_norm and norm:
        max_days = norm[0]
        answer["understood"]["max_days"] = max_days

    answer["answer"] = _answer(found, understood.treatment_key, understood.city, max_days)
    return answer


def _answer(found: list[dict], treatment_key: str, city: str | None, max_days: int | None) -> dict:
    treatment_type = found[0]["treatment_type"]

    # A location that reported no figure cannot be said to meet a deadline, so it is
    # not among the results. It is counted instead: dropping it silently would make
    # the answer look more complete than it is.
    results = found
    unreported = 0
    if max_days is not None:
        results = [row for row in found if row["days"] is not None and row["days"] <= max_days]
        unreported = sum(1 for row in found if row["days"] is None)
    return {
        "treatment_key": treatment_key,
        # From `found`, not `results`: a deadline nothing meets leaves results empty,
        # and the answer still has to say which treatment it found nothing for.
        "treatment": found[0]["treatment"],
        "treatment_type": treatment_type,
        "city": city,
        "max_days": max_days,
        "count": len(results),
        "considered": len(found),
        "unreported": unreported,
        "source": "Nederlandse Zorgautoriteit (NZa)",
        # The norm this treatment type is judged against, in days. A pair, because
        # a behandeling may be poliklinisch (6 wk) or klinisch (7 wk) and the source
        # does not say which.
        "norm_days": treeknorm.norm_for(treatment_type),
        "norm_source": "NZa Beleidsregel toezichtkader zorgplicht zorgverzekeraars (TH/BR-025)",
        "results": results,
    }


# The static frontend export, on the same port as /api. Mounted last so it never
# shadows an API route. Absent until `npm run build` has run.
if FRONTEND:
    app.mount("/", StaticFiles(directory=FRONTEND, html=True), name="frontend")

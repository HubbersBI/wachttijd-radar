# Wachttijd-radar - multi-stage build.
# Stage 1 builds the Next.js static export; stage 2 runs FastAPI and serves it on
# the same port, so the whole app is one container on one port.

# Node 24 to match CI and the engines field in frontend/package.json. Node 20
# reached end of life in April 2026, and a build stage on an unsupported
# runtime is a security problem before it is a compatibility one.
FROM node:24-slim AS frontend

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /usr/local/bin/uv

ENV PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    WACHTTIJD_DB_DIR=/app/db

WORKDIR /app

# Dependencies first so application edits do not invalidate the layer.
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/app ./app
RUN uv sync --frozen --no-dev

# app/main.py serves the static export from <backend root>/static, which is /app/static.
COPY --from=frontend /build/out ./static

# The SQLite file lives in /app/db, backed by the named volume wachttijd-radar-data.
# It starts empty: the first run seeds it from the NZa API, later runs reuse it.
# The synthetic source writes a separate file in the same directory, so invented
# numbers can never end up in the table of reported ones.
EXPOSE 8000

CMD ["sh", "-c", "python -m app.fetch --seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

#!/usr/bin/env bash
# Build the serverless site and preview it.
#   ./scripts/build_static_mac.sh [--refresh] [--base-path /wachttijd-radar] [--port 8099] [--no-serve]
#
# Fetches, writes the API out as flat JSON, and builds the static export. What comes
# out of frontend/out is the whole site: no backend, no API key, nothing to keep alive.

set -euo pipefail

BASE_PATH=""
PORT=8099
REFRESH=0
SERVE=1

while [ $# -gt 0 ]; do
  case "$1" in
    --refresh) REFRESH=1; shift ;;
    --base-path) BASE_PATH="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --no-serve) SERVE=0; shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

if [ "$REFRESH" = "1" ]; then
  echo "Fetching from the NZa API"
  (cd backend && uv run python -m app.fetch --refresh)
fi

echo "Writing the API out as static JSON"
(cd backend && uv run python -m app.export_static --out ../frontend/public/api)

echo "Building the static export"
(cd frontend && NEXT_PUBLIC_WACHTTIJD_STATIC=true NEXT_PUBLIC_BASE_PATH="$BASE_PATH" npm run build)

echo "Built to frontend/out"
[ "$SERVE" = "1" ] || exit 0

if [ -n "$BASE_PATH" ]; then
  # The export expects to sit under $BASE_PATH on the host, and a file server rooted at
  # frontend/out does not put it there. Previewing that faithfully means copying the
  # directory, which is what the real host does for you.
  echo "Built with base path '$BASE_PATH'. Not serving: a local preview would"
  echo "need frontend/out copied into a '$BASE_PATH' directory first."
  exit 0
fi

# Served from a plain file server on purpose: if it works here it works on any static
# host, because nothing else is running.
echo "Serving frontend/out at http://localhost:$PORT/  (Ctrl+C to stop)"
cd frontend/out
open "http://localhost:$PORT/" 2>/dev/null || true
python3 -m http.server "$PORT"

#!/usr/bin/env bash
# Start Wachttijd-radar in Docker (macOS/Linux). Safe to run repeatedly.
#   ./scripts/start_mac.sh [--build] [--port 8000] [--synthetic] [--no-open]

set -euo pipefail

IMAGE_NAME="wachttijd-radar"
CONTAINER_NAME="wachttijd-radar"
VOLUME_NAME="wachttijd-radar-data"
PORT=8000
BUILD=false
SOURCE="nza"
OPEN=true

while [ $# -gt 0 ]; do
    case "$1" in
        --build) BUILD=true ;;
        --port) PORT="$2"; shift ;;
        --synthetic) SOURCE="synthetic" ;;
        --no-open) OPEN=false ;;
        *) echo "unknown option: $1"; exit 1 ;;
    esac
    shift
done

cd "$(dirname "$0")/.."
URL="http://localhost:$PORT"

if [ "$BUILD" = true ] || [ -z "$(docker images -q $IMAGE_NAME)" ]; then
    echo "Building image $IMAGE_NAME"
    docker build -t "$IMAGE_NAME" .
fi

# Replace any container left over from a previous run. The volume is untouched, so
# the waiting times already fetched survive.
if [ -n "$(docker ps -aq -f "name=^${CONTAINER_NAME}$")" ]; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
fi

if ! docker run -d --name "$CONTAINER_NAME" -p "$PORT:8000" \
    -v "$VOLUME_NAME:/app/db" -e "WACHTTIJD_SOURCE=$SOURCE" "$IMAGE_NAME" >/dev/null; then
    echo "docker run failed. Is port $PORT already in use? Try --port 8001"
    exit 1
fi

# The first run fetches from the NZa API, which takes a few seconds. Later runs
# reuse the volume and start immediately.
printf "Waiting for the app to start"
for _ in $(seq 1 60); do
    if curl -sf "$URL/api/health" >/dev/null 2>&1; then
        echo ""
        echo "Wachttijd-radar is running at $URL"
        echo "Stop it with: ./scripts/stop_mac.sh"
        if [ "$OPEN" = true ] && command -v open >/dev/null; then open "$URL"; fi
        exit 0
    fi
    printf "."
    sleep 1
done

echo ""
echo "The app did not become healthy within 60 seconds. Container logs:"
docker logs "$CONTAINER_NAME"
exit 1

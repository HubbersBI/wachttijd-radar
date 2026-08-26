#!/usr/bin/env bash
# Stop Wachttijd-radar (macOS/Linux). Safe to run repeatedly.
#   ./scripts/stop_mac.sh [--remove-data]
#
# The named volume is kept unless --remove-data is given, so the waiting times
# already fetched survive a stop.

set -euo pipefail

CONTAINER_NAME="wachttijd-radar"
VOLUME_NAME="wachttijd-radar-data"
REMOVE_DATA=false

while [ $# -gt 0 ]; do
    case "$1" in
        --remove-data) REMOVE_DATA=true ;;
        *) echo "unknown option: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$(docker ps -aq -f "name=^${CONTAINER_NAME}$")" ]; then
    echo "Wachttijd-radar is not running"
else
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Stopped Wachttijd-radar"
fi

if [ "$REMOVE_DATA" = true ]; then
    docker volume rm "$VOLUME_NAME" >/dev/null
    echo "Removed the data volume. The next start fetches from the NZa API again."
fi

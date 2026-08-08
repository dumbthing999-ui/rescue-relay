#!/usr/bin/env bash
# Every 2 min: ping /api/health to keep backend warm (never sleep)
URL="${HEALTH_URL:-https://rescue-relay.vercel.app/api/health}"
while true; do
  curl -sf -o /dev/null "$URL" && echo "[$(date -Iseconds)] OK" || echo "[$(date -Iseconds)] FAIL"
  sleep 120
done

#!/usr/bin/env bash
# keep-alive.sh — Prevent Render free tier from sleeping
#
# Render free tier sleeps after 15 minutes of inactivity.
# This script pings n8n every 5 minutes to keep it alive.
#
# OPTION 1: Run locally (background)
#   nohup bash scripts/keep-alive.sh &
#
# OPTION 2: UptimeRobot (recommended — free, no local process)
#   1. Go to https://uptimerobot.com (free account)
#   2. Add Monitor → HTTP(s)
#   3. URL: https://n8n-jdp-pipeline.onrender.com/healthz
#   4. Interval: 5 minutes
#   5. Save
#
# OPTION 3: GitHub Actions (free, runs in cloud)
#   See .github/workflows/keep-n8n-alive.yml
#
# OPTION 4: This script with cron (Linux/Mac)
#   crontab -e
#   */5 * * * * /bin/bash /path/to/scripts/keep-alive.sh

set -euo pipefail

N8N_URL="${N8N_URL:-https://n8n-jdp-pipeline.onrender.com}"
HEALTH_URL="${N8N_URL}/healthz"
INTERVAL="${INTERVAL:-300}"  # 5 minutes

echo "🫀 JDP Pipeline Keep-Alive"
echo "   Target: ${HEALTH_URL}"
echo "   Interval: ${INTERVAL}s"
echo "   Press Ctrl+C to stop"
echo ""

while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HEALTH_URL" 2>/dev/null || echo "000")
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  if [[ "$STATUS" == "200" ]]; then
    echo "[$TIMESTAMP] ✅ n8n alive (HTTP $STATUS)"
  else
    echo "[$TIMESTAMP] ⚠️  n8n may be sleeping (HTTP $STATUS) — will retry next cycle"
  fi

  sleep "$INTERVAL"
done

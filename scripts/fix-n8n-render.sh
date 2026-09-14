#!/usr/bin/env bash
# fix-n8n-render.sh — Set critical n8n environment variables on Render
#
# PERMANENT FIX for "redirect to setup" bug:
#   Render free tier loses ~/.n8n/config (encryption key) on every restart.
#   This script sets N8N_ENCRYPTION_KEY as a Render env var so it persists.
#
# Usage:
#   export RENDER_API_KEY="rnd_xxxxxxxxxxxxxxxx"  # Get from Render Dashboard → Account Settings → API Keys
#   bash scripts/fix-n8n-render.sh
#
# Or without API key — prints manual instructions.

set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Config ────────────────────────────────────────────────────────
SERVICE_NAME="n8n-jdp-pipeline"
ENCRYPTION_KEY="jdp-n8n-encryption-2026-permanent"

# ─── Env Vars to Set ──────────────────────────────────────────────
declare -A ENV_VARS=(
  ["N8N_ENCRYPTION_KEY"]="$ENCRYPTION_KEY"
  ["DB_TYPE"]="postgresdb"
  ["DB_POSTGRESDB_HOST"]="dpg-d9qr5lugekts73e7qsdg-a"
  ["DB_POSTGRESDB_PORT"]="5432"
  ["DB_POSTGRESDB_DATABASE"]="n8n_feu7"
  ["DB_POSTGRESDB_USER"]="n8n"
  ["DB_POSTGRESDB_PASSWORD"]="q7kQcoDsZ2OFXfq1xaMK68EB9OXSJbPy"
  ["DB_POSTGRESDB_SCHEMA"]="public"
  ["N8N_DEFAULT_USER_EMAIL"]="emerilansel@gmail.com"
  ["N8N_DEFAULT_USER_PASSWORD"]="J3tdigitalpro"
  ["N8N_BASIC_AUTH_ACTIVE"]="true"
  ["N8N_BASIC_AUTH_USER"]="emerilansel@gmail.com"
  ["N8N_BASIC_AUTH_PASSWORD"]="J3tdigitalpro"
  ["N8N_HOST"]="n8n-jdp-pipeline.onrender.com"
  ["N8N_PROTOCOL"]="https"
  ["WEBHOOK_URL"]="https://n8n-jdp-pipeline.onrender.com/"
  ["EXECUTIONS_DATA_PRUNE"]="true"
  ["EXECUTIONS_DATA_MAX_AGE"]="168"
  ["N8N_METRICS"]="true"
  ["GENERIC_TIMEZONE"]="Asia/Jakarta"
  ["TZ"]="Asia/Jakarta"
)

# ─── Manual Instructions (no API key) ─────────────────────────────
print_manual() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  MANUAL FIX — Set these env vars in Render Dashboard:${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "${CYAN}1. Go to: https://dashboard.render.com${NC}"
  echo -e "${CYAN}2. Click your n8n service (${SERVICE_NAME})${NC}"
  echo -e "${CYAN}3. Environment → Add the following:${NC}"
  echo ""
  for key in $(echo "${!ENV_VARS[@]}" | tr ' ' '\n' | sort); do
    val="${ENV_VARS[$key]}"
    # Mask passwords
    if [[ "$key" == *"PASSWORD"* || "$key" == *"KEY"* || "$key" == *"SECRET"* ]]; then
      masked="${val:0:4}****"
      echo -e "  ${GREEN}${key}${NC} = ${masked}"
    else
      echo -e "  ${GREEN}${key}${NC} = ${val}"
    fi
  done
  echo ""
  echo -e "${CYAN}4. Click 'Save Changes'${NC}"
  echo -e "${CYAN}5. Service will auto-redeploy${NC}"
  echo -e "${CYAN}6. After redeploy, go to https://n8n-jdp-pipeline.onrender.com${NC}"
  echo -e "${CYAN}   → It should show login page (not setup page)${NC}"
  echo -e "${CYAN}   → If setup page appears, create owner with:${NC}"
  echo -e "      Email: emerilansel@gmail.com"
  echo -e "      Password: J3tdigitalpro"
  echo ""
  echo -e "${YELLOW}  THEN import workflows: paste scripts/import-n8n-workflows.js${NC}"
  echo -e "${YELLOW}  into browser console (F12) while logged into n8n.${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ─── API Mode ──────────────────────────────────────────────────────
if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo -e "${RED}RENDER_API_KEY not set.${NC}"
  print_manual
  exit 0
fi

echo -e "${CYAN}Setting env vars on Render service '${SERVICE_NAME}'...${NC}"

# Step 1: Find service ID
echo -e "${CYAN}Finding service...${NC}"
SERVICES=$(curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" \
  "https://api.render.com/v1/services?name=${SERVICE_NAME}")

SERVICE_ID=$(echo "$SERVICES" | node -pe "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  const s = Array.isArray(d) ? d.find(x => x.service && x.service.name === '${SERVICE_NAME}')
    : (d.service && d.service.name === '${SERVICE_NAME}' ? d : null);
  s ? (s.service ? s.service.id : s.id) : '';
" 2>/dev/null || echo "")

if [[ -z "$SERVICE_ID" ]]; then
  echo -e "${RED}Could not find service '${SERVICE_NAME}' via API.${NC}"
  echo -e "${YELLOW}Make sure:${NC}"
  echo -e "  1. RENDER_API_KEY is correct"
  echo -e "  2. Service name matches exactly"
  echo ""
  print_manual
  exit 1
fi

echo -e "${GREEN}Found service: ${SERVICE_ID}${NC}"

# Step 2: Set environment variables
echo -e "${CYAN}Setting ${#ENV_VARS[@]} environment variables...${NC}"

# Build JSON payload
PAYLOAD="["
first=true
for key in $(echo "${!ENV_VARS[@]}" | tr ' ' '\n' | sort); do
  val="${ENV_VARS[$key]}"
  if [[ "$first" == "true" ]]; then
    first=false
  else
    PAYLOAD+=","
  fi
  # Escape JSON special chars in value
  val_escaped=$(echo "$val" | sed 's/\\/\\\\/g; s/"/\\"/g')
  PAYLOAD+="{\"key\":\"${key}\",\"value\":\"${val_escaped}\"}"
done
PAYLOAD+="]"

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "https://api.render.com/v1/services/${SERVICE_ID}/env-vars" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  echo -e "${GREEN}✅ Environment variables set successfully!${NC}"
else
  echo -e "${RED}❌ Failed to set env vars (HTTP ${HTTP_CODE})${NC}"
  echo "$BODY" | head -c 500
  echo ""
  print_manual
  exit 1
fi

# Step 3: Trigger redeploy
echo -e "${CYAN}Triggering redeploy...${NC}"
DEPLOY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "error")

DEPLOY_CODE=$(echo "$DEPLOY_RESPONSE" | tail -1)
if [[ "$DEPLOY_CODE" == "200" || "$DEPLOY_CODE" == "201" ]]; then
  echo -e "${GREEN}✅ Redeploy triggered!${NC}"
else
  echo -e "${YELLOW}⚠️  Could not trigger auto-redeploy. Please redeploy manually.${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  DONE! n8n will redeploy with permanent encryption key.${NC}"
echo -e "${GREEN}  After redeploy (~2 min):${NC}"
echo -e "${GREEN}  1. Go to https://n8n-jdp-pipeline.onrender.com${NC}"
echo -e "${GREEN}  2. Create owner account (if setup page)${NC}"
echo -e "${GREEN}  3. Import workflows via browser console script${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

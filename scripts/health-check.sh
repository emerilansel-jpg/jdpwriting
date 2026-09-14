#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# JDP Pipeline — n8n Health Check & Auto-Recovery Script
# ═══════════════════════════════════════════════════════════
# Checks n8n instance health, PostgreSQL connectivity, and
# workflow status. Can auto-recover workflows if lost.
#
# Usage:
#   bash scripts/health-check.sh           # full health check
#   bash scripts/health-check.sh --fix     # auto-fix issues found
#   bash scripts/health-check.sh --watch   # continuous monitoring (every 5 min)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

N8N_HOST="https://n8n-jdp-pipeline.onrender.com"
N8N_API_KEY="n8n_api_a62c028374a34f3d4693af39aa429ca37bac254ffe9798895bddd9f67ab3c28fc9ac653697e71604"
EXPECTED_WORKFLOWS=24

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=()

# ─── Check n8n reachability ───────────────────────────────
check_n8n() {
    echo -n "🔍 n8n instance... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${N8N_HOST}/healthz" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP ${HTTP_CODE})"
        return 0
    elif [[ "$HTTP_CODE" == "503" ]]; then
        echo -e "${RED}❌ DOWN${NC} (503 Service Unavailable — Render may be sleeping)"
        ISSUES+=("n8n is down (503). Render free tier may have put it to sleep.")
        return 1
    elif [[ "$HTTP_CODE" == "302" || "$HTTP_CODE" == "200" ]]; then
        # Check if it's a setup redirect
        BODY=$(curl -s --max-time 15 "${N8N_HOST}/" 2>/dev/null || echo "")
        if echo "$BODY" | grep -qi "setup\|sign.?up\|create.?owner"; then
            echo -e "${RED}❌ SETUP PAGE${NC} (encryption key may be lost)"
            ISSUES+=("n8n showing setup page. Encryption key lost. Set N8N_ENCRYPTION_KEY env var in Render.")
            return 1
        fi
        echo -e "${GREEN}✅ OK${NC} (HTTP ${HTTP_CODE})"
        return 0
    else
        echo -e "${YELLOW}⚠️  UNKNOWN${NC} (HTTP ${HTTP_CODE})"
        ISSUES+=("n8n returned unexpected HTTP ${HTTP_CODE}")
        return 1
    fi
}

# ─── Check API access ────────────────────────────────────
check_api() {
    echo -n "🔍 n8n API access... "
    RESPONSE=$(curl -s --max-time 15 \
        -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_HOST}/api/v1/workflows?limit=1" 2>/dev/null || echo "")

    if echo "$RESPONSE" | grep -q '"data"'; then
        echo -e "${GREEN}✅ OK${NC} (API key valid)"
        return 0
    elif echo "$RESPONSE" | grep -qi "unauthorized\|invalid\|forbidden"; then
        echo -e "${RED}❌ AUTH FAILED${NC} (API key invalid or n8n not initialized)"
        ISSUES+=("n8n API key invalid. Regenerate in n8n → Settings → API.")
        return 1
    else
        echo -e "${YELLOW}⚠️  UNREACHABLE${NC}"
        ISSUES+=("Cannot reach n8n API. Instance may be down.")
        return 1
    fi
}

# ─── Check workflow count ────────────────────────────────
check_workflows() {
    echo -n "🔍 n8n workflows... "
    RESPONSE=$(curl -s --max-time 15 \
        -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_HOST}/api/v1/workflows?limit=100" 2>/dev/null || echo "")

    WF_COUNT=$(echo "$RESPONSE" | node -e "
        const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        console.log((d.data||[]).length);
    " 2>/dev/null || echo "0")

    ACTIVE_COUNT=$(echo "$RESPONSE" | node -e "
        const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        console.log((d.data||[]).filter(w => w.active).length);
    " 2>/dev/null || echo "0")

    if [[ "$WF_COUNT" -ge "$EXPECTED_WORKFLOWS" ]]; then
        echo -e "${GREEN}✅ OK${NC} (${WF_COUNT} workflows, ${ACTIVE_COUNT} active)"
        return 0
    elif [[ "$WF_COUNT" -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  INCOMPLETE${NC} (${WF_COUNT}/${EXPECTED_WORKFLOWS} workflows, ${ACTIVE_COUNT} active)"
        ISSUES+=("Only ${WF_COUNT}/${EXPECTED_WORKFLOWS} workflows found. Run: bash scripts/export-n8n-workflows.sh --import-all")
        return 1
    else
        echo -e "${RED}❌ EMPTY${NC} (0 workflows — all lost)"
        ISSUES+=("ALL workflows lost! Auto-recovery needed.")
        return 1
    fi
}

# ─── Check old instance ───────────────────────────────────
check_old_instance() {
    echo -n "🔍 Old instance (n8n-service-di79)... "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
        "https://n8n-service-di79.onrender.com/healthz" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" == "200" ]]; then
        echo -e "${RED}⚠️  STILL ALIVE${NC} (HTTP ${HTTP_CODE})"
        ISSUES+=("Old instance n8n-service-di79.onrender.com is still running! Delete it from Render to avoid confusion and save resources.")
        return 1
    elif [[ "$HTTP_CODE" == "503" ]]; then
        echo -e "${YELLOW}💤 SLEEPING${NC} (503 — exists but sleeping, should be deleted from Render)"
        ISSUES+=("Old instance n8n-service-di79.onrender.com still exists on Render (sleeping). Delete it.")
        return 0
    else
        echo -e "${GREEN}✅ GONE${NC} (HTTP ${HTTP_CODE})"
        return 0
    fi
}

# ─── Auto-fix issues ─────────────────────────────────────
auto_fix() {
    echo ""
    echo "🔧 Auto-fix mode..."

    for issue in "${ISSUES[@]}"; do
        if echo "$issue" | grep -q "workflows lost\|workflows.*missing\|ALL workflows"; then
            echo "  → Attempting workflow recovery..."
            bash "${SCRIPT_DIR}/export-n8n-workflows.sh" --import-all
        fi
    done
}

# ─── Main ─────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════"
echo "  JDP Pipeline — Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════════════"
echo ""

check_n8n || true
check_api || true
check_workflows || true
check_old_instance || true

echo ""
echo "─────────────────────────────────────────────────────"

if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All checks passed. System healthy.${NC}"
else
    echo -e "${YELLOW}⚠️  ${#ISSUES[@]} issue(s) found:${NC}"
    for i in "${!ISSUES[@]}"; do
        echo "  $((i+1)). ${ISSUES[$i]}"
    done

    if [[ "${1:-}" == "--fix" ]]; then
        auto_fix
    else
        echo ""
        echo "💡 Run with --fix to attempt auto-recovery:"
        echo "   bash scripts/health-check.sh --fix"
    fi
fi

# ─── Watch mode ───────────────────────────────────────────
if [[ "${1:-}" == "--watch" ]]; then
    echo ""
    echo "👁  Watch mode — checking every 5 minutes (Ctrl+C to stop)"
    while true; do
        sleep 300
        echo ""
        echo "═══ $(date '+%H:%M:%S') ═══"
        ISSUES=()
        check_n8n || true
        check_workflows || true
    done
fi

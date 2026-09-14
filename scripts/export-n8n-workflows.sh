#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# JDP Pipeline — n8n Workflow Auto-Export Script
# ═══════════════════════════════════════════════════════════
# Exports all n8n workflows via API and saves as JSON files.
# Run after any workflow change to create a recovery point.
#
# Prerequisites:
#   - curl installed
#   - n8n API key (from coldstart.md or .env)
#
# Usage:
#   bash scripts/export-n8n-workflows.sh                    # export all
#   bash scripts/export-n8n-workflows.sh --list             # list workflows only
#   bash scripts/export-n8n-workflows.sh --import-all       # reimport all from n8n-templates/
#
# Output: n8n-templates/auto-export/ folder with timestamped exports

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXPORT_DIR="${PROJECT_ROOT}/n8n-templates/auto-export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MAX_EXPORTS=20  # keep last 20 export sets

# ─── n8n connection settings ──────────────────────────────
N8N_HOST="https://n8n-jdp-pipeline.onrender.com"
N8N_API_KEY="n8n_api_a62c028374a34f3d4693af39aa429ca37bac254ffe9798895bddd9f67ab3c28fc9ac653697e71604"

# ─── Handle flags ─────────────────────────────────────────
if [[ "${1:-}" == "--list" ]]; then
    echo "📋 Listing all workflows..."
    RESPONSE=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_HOST}/api/v1/workflows?limit=100")
    echo "$RESPONSE" | node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        const workflows = data.data || [];
        console.log('Found ' + workflows.length + ' workflows:');
        workflows.forEach(w => {
            console.log('  ' + w.id + '  ' + (w.active ? '✅' : '❌') + '  ' + w.name);
        });
    " 2>/dev/null || echo "$RESPONSE"
    exit 0
fi

if [[ "${1:-}" == "--import-all" ]]; then
    echo "📥 Importing all workflows from n8n-templates/..."
    TEMPLATE_DIR="${PROJECT_ROOT}/n8n-templates"

    # First, get existing workflows to know which to update vs create
    EXISTING=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_HOST}/api/v1/workflows?limit=100")
    EXISTING_IDS=$(echo "$EXISTING" | node -e "
        const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
        (d.data||[]).forEach(w => console.log(w.id + '|' + w.name));
    " 2>/dev/null || echo "")

    IMPORTED=0
    FAILED=0
    for JSON_FILE in "${TEMPLATE_DIR}"/step-*.json "${TEMPLATE_DIR}"/orchestrator.json; do
        [[ -f "$JSON_FILE" ]] || continue
        FILENAME=$(basename "$JSON_FILE" .json)
        echo -n "  ${FILENAME}... "

        # Try to find existing workflow ID by name
        WF_NAME=$(node -e "const d=JSON.parse(require('fs').readFileSync('${JSON_FILE}','utf8'));console.log(d.name||'')" 2>/dev/null || echo "")
        EXISTING_ID=$(echo "$EXISTING_IDS" | grep -i "${WF_NAME}" | head -1 | cut -d'|' -f1 || echo "")

        if [[ -n "$EXISTING_ID" ]]; then
            # Update existing
            RESULT=$(curl -s -X PUT \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d @"$JSON_FILE" \
                "${N8N_HOST}/api/v1/workflows/${EXISTING_ID}" 2>&1)
            if echo "$RESULT" | grep -q '"id"'; then
                echo "✅ updated (${EXISTING_ID})"
                IMPORTED=$((IMPORTED + 1))
            else
                echo "❌ failed: $(echo "$RESULT" | head -1)"
                FAILED=$((FAILED + 1))
            fi
        else
            # Create new
            RESULT=$(curl -s -X POST \
                -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
                -H "Content-Type: application/json" \
                -d @"$JSON_FILE" \
                "${N8N_HOST}/api/v1/workflows" 2>&1)
            if echo "$RESULT" | grep -q '"id"'; then
                NEW_ID=$(echo "$RESULT" | node -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).id)" 2>/dev/null || echo "?")
                echo "✅ created (${NEW_ID})"
                IMPORTED=$((IMPORTED + 1))
            else
                echo "❌ failed: $(echo "$RESULT" | head -1)"
                FAILED=$((FAILED + 1))
            fi
        fi
    done
    echo ""
    echo "📊 Results: ${IMPORTED} imported, ${FAILED} failed"
    exit 0
fi

# ─── Export all workflows ─────────────────────────────────
mkdir -p "$EXPORT_DIR/${TIMESTAMP}"

echo "📦 Exporting all n8n workflows..."
echo "   Source: ${N8N_HOST}"
echo "   Target: ${EXPORT_DIR}/${TIMESTAMP}/"

# Get all workflows
RESPONSE=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
    "${N8N_HOST}/api/v1/workflows?limit=100")

WORKFLOW_COUNT=$(echo "$RESPONSE" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log((d.data||[]).length);
" 2>/dev/null || echo "0")

if [[ "$WORKFLOW_COUNT" == "0" ]]; then
    echo "⚠️  No workflows found. n8n may be down or empty."
    exit 1
fi

echo "   Found ${WORKFLOW_COUNT} workflows"

# Export each workflow
EXPORTED=0
FAILED=0

echo "$RESPONSE" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    (d.data||[]).forEach(w => console.log(w.id + '|' + w.name));
" 2>/dev/null | while IFS='|' read -r WF_ID WF_NAME; do
    # Sanitize filename
    SAFE_NAME=$(echo "$WF_NAME" | tr -cd 'a-zA-Z0-9_-' | tr '[:upper:]' '[:lower:]' | head -c 50)
    OUT_FILE="${EXPORT_DIR}/${TIMESTAMP}/${SAFE_NAME:-workflow}_${WF_ID}.json"

    WF_DATA=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
        "${N8N_HOST}/api/v1/workflows/${WF_ID}")

    if echo "$WF_DATA" | grep -q '"id"'; then
        echo "$WF_DATA" | node -e "
            const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
            // Remove runtime fields that shouldn't be imported
            delete d.createdAt;
            delete d.updatedAt;
            delete d.versionId;
            console.log(JSON.stringify(d, null, 2));
        " 2>/dev/null > "$OUT_FILE"
        echo "  ✅ ${WF_NAME} → $(basename "$OUT_FILE")"
        EXPORTED=$((EXPORTED + 1))
    else
        echo "  ❌ ${WF_NAME} — export failed"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "📊 Exported: ${EXPORTED}, Failed: ${FAILED}"
echo "📁 Location: ${EXPORT_DIR}/${TIMESTAMP}/"

# ─── Prune old exports ───────────────────────────────────
EXPORT_COUNT=$(ls -1d "${EXPORT_DIR}"/20*/ 2>/dev/null | wc -l)
if [[ "$EXPORT_COUNT" -gt "$MAX_EXPORTS" ]]; then
    DELETE_COUNT=$((EXPORT_COUNT - MAX_EXPORTS))
    echo "🗑  Pruning ${DELETE_COUNT} old export set(s)..."
    ls -1d "${EXPORT_DIR}"/20*/ | head -n "$DELETE_COUNT" | xargs rm -rf
fi

echo "💡 To restore: bash scripts/export-n8n-workflows.sh --import-all"

# ─── CRON / POST-CHANGE HOOK ──────────────────────────────
# Run after any n8n workflow change to create a recovery point:
#
# Option 1: Manual after changes
#   bash scripts/export-n8n-workflows.sh
#
# Option 2: Daily cron (alongside DB backup)
#   0 3 * * * cd "/path/to/jdpwriting" && bash scripts/export-n8n-workflows.sh >> backups/export.log 2>&1
#
# Option 3: Windows Task Scheduler
#   schtasks /create /tn "n8n-export" /tr "bash D:\...\scripts\export-n8n-workflows.sh" /sc daily /st 03:30

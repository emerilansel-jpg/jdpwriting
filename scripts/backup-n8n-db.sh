#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# JDP Pipeline — n8n PostgreSQL Auto-Backup Script
# ═══════════════════════════════════════════════════════════
# Creates a timestamped pg_dump of the n8n database.
# Run manually or via cron (see bottom of file for examples).
#
# Prerequisites:
#   - pg_dump installed (comes with PostgreSQL client tools)
#   - DB connection string accessible (from .env or passed as arg)
#
# Usage:
#   bash scripts/backup-n8n-db.sh                    # use default .env
#   bash scripts/backup-n8n-db.sh "postgresql://..."  # use custom connection string
#   bash scripts/backup-n8n-db.sh --restore FILE.gz   # restore from backup
#
# Backup location: backups/ folder in project root

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MAX_BACKUPS=30  # keep last 30 backups, delete older ones

# ─── Load connection string ──────────────────────────────
if [[ "${1:-}" == "--restore" ]]; then
    RESTORE_FILE="${2:?Usage: backup-n8n-db.sh --restore <file.gz>}"
    if [[ ! -f "$RESTORE_FILE" ]]; then
        echo "❌ Backup file not found: $RESTORE_FILE"
        exit 1
    fi
    # Load DB URL from .env
    if [[ -f "${PROJECT_ROOT}/.env" ]]; then
        source <(grep -E '^DB_POSTGRESDB_' "${PROJECT_ROOT}/.env" | sed 's/^/export /')
    fi
    DB_URL="postgresql://${DB_POSTGRESDB_USER}:${DB_POSTGRESDB_PASSWORD}@${DB_POSTGRESDB_HOST}/${DB_POSTGRESDB_DATABASE}"
    echo "⚠️  RESTORING database from: $RESTORE_FILE"
    echo "   Target: ${DB_POSTGRESDB_HOST}/${DB_POSTGRESDB_DATABASE}"
    read -p "   Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    pg_restore --clean --if-exists --no-owner --no-privileges \
        -d "$DB_URL" "$RESTORE_FILE" 2>/dev/null || \
    gunzip -c "$RESTORE_FILE" | psql "$DB_URL" 2>/dev/null
    echo "✅ Restore complete"
    exit 0
fi

# ─── Determine DB connection string ──────────────────────
if [[ -n "${1:-}" && "${1:-}" != "--restore" ]]; then
    DB_URL="$1"
elif [[ -f "${PROJECT_ROOT}/.env" ]]; then
    source <(grep -E '^DB_POSTGRESDB_' "${PROJECT_ROOT}/.env" | sed 's/^/export /')
    DB_URL="postgresql://${DB_POSTGRESDB_USER}:${DB_POSTGRESDB_PASSWORD}@${DB_POSTGRESDB_HOST}/${DB_POSTGRESDB_DATABASE}"
else
    echo "❌ No .env found and no connection string provided."
    echo "Usage: bash scripts/backup-n8n-db.sh \"postgresql://user:pass@host/db\""
    exit 1
fi

# ─── Create backup directory ──────────────────────────────
mkdir -p "$BACKUP_DIR"

# ─── Run pg_dump ──────────────────────────────────────────
BACKUP_FILE="${BACKUP_DIR}/n8n_backup_${TIMESTAMP}.sql.gz"

echo "📦 Backing up n8n database..."
echo "   Source: ${DB_POSTGRESDB_HOST:-remote}/${DB_POSTGRESDB_DATABASE:-n8n}"
echo "   Target: ${BACKUP_FILE}"

pg_dump \
    --no-owner \
    --no-privileges \
    --format=custom \
    "$DB_URL" 2>/dev/null | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup complete: ${BACKUP_SIZE}"

# ─── Prune old backups ───────────────────────────────────
BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/n8n_backup_*.sql.gz 2>/dev/null | wc -l)
if [[ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "🗑  Pruning ${DELETE_COUNT} old backup(s) (keeping last ${MAX_BACKUPS})..."
    ls -1t "${BACKUP_DIR}"/n8n_backup_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo "📁 Total backups: $(ls -1 "${BACKUP_DIR}"/n8n_backup_*.sql.gz 2>/dev/null | wc -l)"

# ─── CRON EXAMPLES ────────────────────────────────────────
# Run daily at 3 AM (add to crontab with: crontab -e):
#   0 3 * * * cd "D:\Library\Kusuma\Documents\OneDrive [Emeril]\OneDrive\jdpwriting" && bash scripts/backup-n8n-db.sh >> backups/backup.log 2>&1
#
# Run every 6 hours:
#   0 */6 * * * cd "D:\Library\Kusuma\Documents\OneDrive [Emeril]\OneDrive\jdpwriting" && bash scripts/backup-n8n-db.sh >> backups/backup.log 2>&1
#
# Windows Task Scheduler (PowerShell):
#   schtasks /create /tn "n8n-backup" /tr "bash D:\...\scripts\backup-n8n-db.sh" /sc daily /st 03:00

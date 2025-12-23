#!/bin/bash

# Scheduled Database Backup Script
# Designed to be run via cron job
# Usage: Add to crontab: 0 2 * * * /path/to/scheduled-backup.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="afiste_backup_${TIMESTAMP}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/afiste_development}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Extract database connection details
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Log file
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting scheduled backup..."
log "Database: $DB_NAME"
log "Backup file: $BACKUP_DIR/$BACKUP_NAME.sql.gz"

# Set password for pg_dump
export PGPASSWORD="$DB_PASS"

# Perform backup
if pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f "$BACKUP_DIR/$BACKUP_NAME.sql" 2>>"$LOG_FILE"; then
  
  # Compress backup
  gzip -f "$BACKUP_DIR/$BACKUP_NAME.sql"
  
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.sql.gz" | cut -f1)
  log "Backup completed: $BACKUP_DIR/$BACKUP_NAME.sql.gz ($BACKUP_SIZE)"
  
  # Clean old backups (keep last 30 days)
  find "$BACKUP_DIR" -name "afiste_backup_*.sql.gz" -mtime +30 -delete
  log "Cleaned backups older than 30 days"
  
  # Keep only last 10 backups (safety measure)
  ls -t "$BACKUP_DIR"/afiste_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
  log "Kept only last 10 backups"
  
  exit 0
else
  log "Backup failed!"
  exit 1
fi


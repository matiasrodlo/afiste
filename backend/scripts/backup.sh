#!/bin/bash

# Database Backup Script for Afiste
# Usage: ./scripts/backup.sh [backup_name]

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-afiste_backup_${TIMESTAMP}}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/afiste_development}"

# Extract database connection details
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_DIR/$BACKUP_NAME.sql"

# Set password for pg_dump
export PGPASSWORD="$DB_PASS"

# Perform backup
pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -f "$BACKUP_DIR/$BACKUP_NAME.sql"

# Compress backup
gzip -f "$BACKUP_DIR/$BACKUP_NAME.sql"

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME.sql.gz"

# Clean old backups (keep last 7 days)
find "$BACKUP_DIR" -name "afiste_backup_*.sql.gz" -mtime +7 -delete

echo "Cleaned backups older than 7 days"


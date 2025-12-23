#!/bin/bash

# Database Restore Script for Afiste
# Usage: ./scripts/restore.sh <backup_file.sql.gz>

set -e

if [ -z "$1" ]; then
  echo "Error: Backup file required"
  echo "Usage: ./scripts/restore.sh <backup_file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/afiste_development}"

# Extract database connection details
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will restore the database from backup"
echo "Database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 1
fi

echo "Starting database restore..."

# Set password for psql
export PGPASSWORD="$DB_PASS"

# Decompress and restore
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME"
else
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
fi

echo "Database restored successfully"

# Regenerate Prisma client
echo "Regenerating Prisma client..."
npx prisma generate

echo "Restore complete"


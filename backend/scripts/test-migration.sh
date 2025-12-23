#!/bin/bash

# Test Migration Script
# Tests migrations on a temporary database
# Usage: ./scripts/test-migration.sh

set -e

echo "Testing Database Migrations"
echo ""

# Configuration
TEST_DB_NAME="afiste_migration_test_$(date +%s)"
TEST_DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/$TEST_DB_NAME?schema=public}"

# Extract database connection details
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
BASE_DB=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^@]*@[^:]*:\([0-9]*\)\/\([^?]*\).*/\2/p' | cut -d'/' -f1)

export PGPASSWORD="$DB_PASS"

cleanup() {
  echo ""
  echo "Cleaning up test database..."
  psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$BASE_DB" \
    -c "DROP DATABASE IF EXISTS $TEST_DB_NAME;" 2>/dev/null || true
  echo "Cleanup complete"
}

trap cleanup EXIT

echo "Creating test database: $TEST_DB_NAME"
psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$BASE_DB" \
  -c "CREATE DATABASE $TEST_DB_NAME;" || {
  echo "Failed to create test database"
  exit 1
}

echo "Test database created"
echo ""

echo "Applying migrations..."
export DATABASE_URL="$TEST_DATABASE_URL"
npx prisma migrate deploy

echo ""
echo "Migrations applied successfully"
echo ""

echo "Verifying migration status..."
npx prisma migrate status

echo ""
echo "Migration test complete!"


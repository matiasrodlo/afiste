#!/bin/bash

# Database Migration Script for Afiste
# Usage: ./scripts/migrate.sh [dev|deploy|status|reset]

set -e

MODE="${1:-dev}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/afiste_development?schema=public}"

echo "Database Migration Script"
echo "Mode: $MODE"
echo ""

case "$MODE" in
  dev)
    echo "Creating and applying migration..."
    echo "Enter migration name:"
    read -r MIGRATION_NAME
    
    if [ -z "$MIGRATION_NAME" ]; then
      echo "Error: Migration name required"
      exit 1
    fi
    
    npx prisma migrate dev --name "$MIGRATION_NAME"
    echo "Migration created and applied"
    ;;
    
  deploy)
    echo "Deploying migrations to database..."
    npx prisma migrate deploy
    echo "Migrations deployed"
    ;;
    
  status)
    echo "Checking migration status..."
    npx prisma migrate status
    ;;
    
  reset)
    echo "WARNING: This will delete all data!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
      echo "Reset cancelled"
      exit 1
    fi
    
    echo "Resetting database..."
    npx prisma migrate reset
    echo "Database reset complete"
    ;;
    
  *)
    echo "Invalid mode: $MODE"
    echo "Usage: ./scripts/migrate.sh [dev|deploy|status|reset]"
    exit 1
    ;;
esac

echo ""
echo "Regenerating Prisma client..."
npx prisma generate

echo "Migration script complete"


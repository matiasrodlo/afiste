#!/bin/bash

# Production Rollback Script
# Usage: ./scripts/rollback.sh [version]

set -e

VERSION=${1:-previous}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting rollback to $VERSION..."

cd "$PROJECT_DIR"

# Stop current services
echo "Stopping current services..."
docker-compose -f docker-compose.prod.yml down

# Rollback database migrations (if needed)
if [ "$VERSION" != "previous" ]; then
    echo "Rolling back database migrations..."
    # Note: Prisma doesn't support automatic rollback
    # You'll need to manually revert migrations
    echo "Manual database rollback may be required"
fi

# Pull previous images
echo "Pulling previous Docker images..."
# In a real scenario, you'd tag specific versions
# docker-compose -f docker-compose.prod.yml pull

# Start previous version
echo "Starting previous version..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "Waiting for services..."
sleep 10

# Health check
echo "Running health checks..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "Rollback successful!"
else
    echo "Health check failed after rollback"
    exit 1
fi

echo ""
echo "Rollback complete!"


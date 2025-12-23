#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Starting deployment to $ENVIRONMENT..."

cd "$PROJECT_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env.production ]; then
    echo ".env.production not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env.production
        echo "Please update .env.production with production values"
        exit 1
    else
        echo ".env.example not found. Cannot proceed."
        exit 1
    fi
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Pull latest images
echo "Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build images
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

# Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Health check
echo "Running health checks..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "Backend is healthy!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Backend health check failed after $MAX_RETRIES attempts"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Show status
echo ""
echo "Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Deployment complete!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:80"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop services: docker-compose -f docker-compose.prod.yml down"
echo "  - Restart services: docker-compose -f docker-compose.prod.yml restart"


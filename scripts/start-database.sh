#!/bin/bash

# Script to start PostgreSQL database for Afiste
# This script checks for Docker first, then tries local PostgreSQL

set -e

echo "Checking for database options..."

# Check if Docker is available and running
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "Docker is available"
    
    # Check if postgres container exists
    if docker ps -a --format '{{.Names}}' | grep -q '^afiste-postgres$'; then
        echo "Starting existing PostgreSQL container..."
        docker start afiste-postgres
        echo "PostgreSQL container started"
        echo "Waiting for database to be ready..."
        sleep 3
        echo "Database should be ready at localhost:5432"
        exit 0
    else
        echo "Starting PostgreSQL with docker-compose..."
        cd "$(dirname "$0")/.."
        docker-compose up -d postgres
        echo "PostgreSQL started via docker-compose"
        echo "Waiting for database to be ready..."
        sleep 5
        echo "Database should be ready at localhost:5432"
        exit 0
    fi
fi

# Check for Homebrew PostgreSQL
if command -v brew &> /dev/null; then
    if brew services list 2>/dev/null | grep -q postgresql; then
        echo "Starting PostgreSQL via Homebrew..."
        brew services start postgresql
        echo "PostgreSQL started via Homebrew"
        exit 0
    fi
fi

# Check for system PostgreSQL (macOS)
if [ -f /Library/PostgreSQL/*/bin/pg_ctl ]; then
    PG_BIN=$(ls -d /Library/PostgreSQL/*/bin | head -1)
    echo "Starting PostgreSQL from /Library/PostgreSQL..."
    sudo $PG_BIN/pg_ctl -D /Library/PostgreSQL/*/data start
    echo "PostgreSQL started"
    exit 0
fi

echo "Could not find PostgreSQL installation"
echo ""
echo "Please install PostgreSQL using one of these methods:"
echo "  1. Docker: docker-compose up -d postgres"
echo "  2. Homebrew: brew install postgresql@15 && brew services start postgresql@15"
echo "  3. Download from: https://www.postgresql.org/download/"
echo ""
exit 1


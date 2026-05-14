#!/bin/bash
# ScholarSight VPS Deployment Script
# Usage: ./scripts/deploy.sh [environment]
#   environment: production (default) | staging
#
# Prerequisites: Ubuntu 22.04+, Docker installed, domain DNS configured

set -euo pipefail

ENVIRONMENT="${1:-production}"
DOMAIN="${DOMAIN:-scholarsight.example.com}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== ScholarSight Deployment ==="
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"

# --- Check Prerequisites ---
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    echo "  curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "ERROR: docker compose is not available."
    exit 1
fi

# --- Environment Setup ---
if [ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    echo "Creating .env.$ENVIRONMENT file..."
    openssl rand -hex 32 > /tmp/secret_key

    cat > "$PROJECT_ROOT/.env.$ENVIRONMENT" <<EOF
# ScholarSight - $ENVIRONMENT Config
SECRET_KEY=$(cat /tmp/secret_key)
OPENAI_API_KEY=your-openai-api-key-here
ENVIRONMENT=$ENVIRONMENT
DOMAIN=$DOMAIN
EOF
    echo "  Created .env.$ENVIRONMENT - Please edit with your actual API keys."
    echo "  File: $PROJECT_ROOT/.env.$ENVIRONMENT"
fi

# --- Pull & Build ---
echo "Building Docker images..."
cd "$PROJECT_ROOT"

docker compose -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    --env-file ".env.$ENVIRONMENT" \
    build --pull

# --- Start Services ---
echo "Starting services..."
docker compose -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    --env-file ".env.$ENVIRONMENT" \
    up -d

# --- Database Setup ---
echo "Waiting for database..."
sleep 5

echo "Running database migrations..."
docker compose -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    exec -T backend alembic upgrade head || echo "Migrations may already be applied"

# --- SSL Certificate ---
if command -v certbot &> /dev/null && [ "$ENVIRONMENT" = "production" ]; then
    echo "Obtaining SSL certificate..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
        --email "admin@$DOMAIN" || echo "SSL setup skipped"
fi

# --- Seed Data ---
echo "Loading seed data..."
docker compose -f docker/docker-compose.yml \
    -f docker/docker-compose.prod.yml \
    exec -T backend python scripts/seed_data.py || echo "Seed data skipped"

echo ""
echo "=== Deployment Complete ==="
echo "Application: https://$DOMAIN"
echo "API Docs:    https://$DOMAIN/api/docs"
echo "Health:      https://$DOMAIN/api/health"
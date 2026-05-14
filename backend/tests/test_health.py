"""Tests for the health check endpoint."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    """Verify the health check endpoint returns healthy status."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "scholarsight-api"


@pytest.mark.asyncio
async def test_api_docs_available():
    """Verify OpenAPI docs are accessible."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert data["info"]["title"] == "ScholarSight API"
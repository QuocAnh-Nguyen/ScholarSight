"""Health check routes."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Docker/liveness probes."""
    return {"status": "healthy", "service": "scholarsight-api", "version": "0.1.0"}
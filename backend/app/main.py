"""ScholarSight Backend - FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.logging import setup_logging
from app.api.routes import health, ingest, query, probability, roadmap, auth, documents

setup_logging()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="ScholarSight API",
        description="AI-Powered Academic & Admissions Consultant",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Prometheus metrics
    if settings.ENVIRONMENT != "test":
        Instrumentator().instrument(app).expose(app, endpoint="/api/metrics")

    # Register routers
    app.include_router(health.router, prefix="/api", tags=["Health"])
    app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
    app.include_router(ingest.router, prefix="/api/ingest", tags=["Ingestion"])
    app.include_router(query.router, prefix="/api/query", tags=["Query"])
    app.include_router(probability.router, prefix="/api/probability", tags=["Probability"])
    app.include_router(roadmap.router, prefix="/api/roadmap", tags=["Roadmap"])
    app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])

    return app


app = create_app()
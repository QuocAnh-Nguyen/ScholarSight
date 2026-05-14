"""Application configuration via pydantic-settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "dev-secret-change-in-production"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://scholarsight:scholarsight_dev@localhost:5432/scholarsight"
    DATABASE_URL_SYNC: str = "postgresql://scholarsight:scholarsight_dev@localhost:5432/scholarsight"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # MinIO
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "scholarsight-documents"
    MINIO_SECURE: bool = False

    # Embedding Service
    EMBEDDING_SERVICE_URL: str = "http://localhost:8080"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_MODEL_MINI: str = "gpt-4o-mini"

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7  # 7 days

    # Retrieval
    SEMANTIC_SEARCH_THRESHOLD: float = 0.75
    SEMANTIC_SEARCH_TOP_K: int = 5

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"


settings = Settings()
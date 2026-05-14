"""Celery application configuration for async task processing."""

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "scholarsight_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_queues={
        "ocr_extraction": {"exchange": "ocr", "routing_key": "ocr"},
        "summarization": {"exchange": "summ", "routing_key": "summ"},
        "embedding_generation": {"exchange": "embed", "routing_key": "embed"},
    },
    task_routes={
        "app.tasks.ocr_tasks.*": {"queue": "ocr_extraction"},
        "app.tasks.summarization_tasks.*": {"queue": "summarization"},
        "app.tasks.embedding_tasks.*": {"queue": "embedding_generation"},
    },
)
"""Celery application configuration for async task processing.

FIXES APPLIED:
  - #1D  Worker shutdown signal: dispose_worker_engine() is now called on
         worker_process_shutdown to prevent PostgreSQL connection pool leaks.
"""

from celery import Celery
from celery.signals import worker_process_shutdown

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

# ---------------------------------------------------------------------------
# Fix #1D: Register a worker_process_shutdown handler to dispose the shared
# async engine.  Without this, every worker recycle orphans PostgreSQL
# connections, eventually exhausting the connection pool.
# ---------------------------------------------------------------------------

@worker_process_shutdown.connect
def _cleanup_worker_engine(**kwargs):
    """Dispose the shared async engine on worker process shutdown."""
    import asyncio
    import logging
    logger = logging.getLogger(__name__)

    try:
        from app.db.worker_engine import dispose_worker_engine

        loop = asyncio.new_event_loop()
        loop.run_until_complete(dispose_worker_engine())
        loop.close()
        logger.info("Celery worker engine disposed via shutdown signal")
    except Exception:
        logger.warning("Failed to dispose worker engine on shutdown", exc_info=True)

# ---------------------------------------------------------------------------
# Task discovery — import task modules so the @celery_app.task decorator
# registers them with the Celery application at startup.  Without these
# imports the worker process will reject tasks with "unregistered task".
# ---------------------------------------------------------------------------
import app.tasks.ocr_tasks           # noqa: F401, E402
import app.tasks.summarization_tasks  # noqa: F401, E402
import app.tasks.embedding_tasks      # noqa: F401, E402

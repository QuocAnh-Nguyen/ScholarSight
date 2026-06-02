"""Shared async engine for Celery workers.

Provides a single, long-lived async engine + session factory that all Celery
tasks share.  The engine is lazily created on first use and explicitly disposed
via `dispose_worker_engine()` on worker shutdown, preventing the connection-pool
leak described in the audit.

Usage in a Celery task:

    from app.db.worker_engine import get_worker_session

    async def _work():
        async with get_worker_session() as db:
            ...

    asyncio.run(_work())
"""

from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None
_lock = asyncio.Lock()


async def _get_engine() -> AsyncEngine:
    """Lazily create and return the shared async engine."""
    global _engine, _session_factory

    if _engine is not None:
        return _engine

    async with _lock:
        if _engine is not None:
            return _engine

        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=settings.DEBUG,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
        _session_factory = async_sessionmaker(
            _engine, class_=AsyncSession, expire_on_commit=False
        )
        logger.info("Created shared worker async engine")
        return _engine


def get_worker_session() -> AsyncSession:
    """Return an async session created from the shared engine.

    This is a *sync* factory so Celery tasks can call it from non-async scope,
    but the returned session must be used inside an async context.
    """
    if _session_factory is None:
        # Called before first async init — force synchronous init
        import asyncio as _asyncio
        try:
            loop = _asyncio.get_running_loop()
        except RuntimeError:
            loop = _asyncio.new_event_loop()
            _asyncio.set_event_loop(loop)
        loop.run_until_complete(_get_engine())

    assert _session_factory is not None
    return _session_factory()


async def dispose_worker_engine() -> None:
    """Dispose the shared engine (called on worker shutdown)."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("Disposed shared worker async engine")

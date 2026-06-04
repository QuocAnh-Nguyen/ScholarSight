"""Shared async engine for Celery workers.

FIXES APPLIED:
  - #1  Event loop RuntimeError: get_worker_session is now an async function
         that uses asyncio.Lock to lazily initialise the engine.  Celery tasks
         call `async with await get_worker_session() as db:` inside their
         asyncio.run() block — no run_until_complete on a running loop.

Provides a single, long-lived async engine + session factory that all Celery
tasks share.  The engine is lazily created on first use and explicitly disposed
via `dispose_worker_engine()` on worker shutdown, preventing the connection-pool
leak.

Usage in a Celery task:

    async def _work():
        async with await get_worker_session() as db:
            ...

    asyncio.run(_work())
"""

from __future__ import annotations

import asyncio
import logging

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
            _engine, class_=AsyncSession, expire_on_commit=False,
        )
        logger.info("Created shared worker async engine")
        return _engine


async def get_worker_session() -> AsyncSession:
    """Return an async session from the shared engine.

    Must be awaited::

        async with await get_worker_session() as db:
            ...
    """
    engine = await _get_engine()
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

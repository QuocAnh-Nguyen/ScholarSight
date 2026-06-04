"""Celery tasks for BGE-M3 embedding generation.

FIXES APPLIED:
  - #1   Event loop RuntimeError: uses `await get_worker_session()`.
  - #2A  DB connection leak: uses shared engine.
  - #1C  Race condition mitigation: fetches summary text from DB by row id.
"""

from __future__ import annotations

import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def generate_embedding_task(self, summary_embedding_id: str):
    """Generate BGE-M3 embedding and update the summary_embeddings row.

    Args:
        summary_embedding_id: UUID of the summary_embeddings row to update.
    """
    async def _embed() -> None:
        from sqlalchemy import text

        from app.db.worker_engine import get_worker_session
        from app.services.embedding.bge_m3 import get_query_embedding

        async with await get_worker_session() as db:
            result = await db.execute(
                text(
                    "SELECT id, summary_text FROM summary_embeddings "
                    "WHERE id = :id"
                ),
                {"id": summary_embedding_id},
            )
            row = result.fetchone()
            if not row:
                logger.warning(
                    "summary_embeddings row %s not found — skipping",
                    summary_embedding_id,
                )
                return

            se_id = str(row[0])
            summary_text = row[1] or ""

            if not summary_text.strip():
                logger.warning("Empty summary for %s — skipping", se_id)
                return

            embedding = await get_query_embedding(summary_text)
            embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

            await db.execute(
                text(
                    "UPDATE summary_embeddings "
                    "SET embedding = :emb::vector "
                    "WHERE id = :id"
                ),
                {"emb": embedding_str, "id": se_id},
            )
            await db.commit()

            logger.info("Generated embedding for row %s", se_id)

    asyncio.run(_embed())

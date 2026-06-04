"""Celery tasks for LLM summarization.

FIXES APPLIED:
  - #1   Event loop RuntimeError: uses `await get_worker_session()`.
  - #2A  DB connection leak: uses shared engine.
  - #1C  Race condition: summary row inserted immediately, embedding chained.
  - #1D  Broker bloat: receives only component_uuid, fetches content from DB.
"""

from __future__ import annotations

import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def summarize_component_task(self, component_uuid: str):
    """Generate a summary for a single raw_component and chain to embedding.

    Args:
        component_uuid: UUID of the raw_components row to summarize.
    """
    async def _summarize() -> None:
        from sqlalchemy import text

        from app.db.worker_engine import get_worker_session
        from app.services.llm.summarizer import summarize_component

        async with await get_worker_session() as db:
            result = await db.execute(
                text(
                    "SELECT id, parent_doc_id, component_type, raw_content, "
                    "       source_file, source_page "
                    "FROM raw_components WHERE id = :id"
                ),
                {"id": component_uuid},
            )
            row = result.fetchone()
            if not row:
                logger.warning(
                    "Component %s not found — skipping summarization",
                    component_uuid,
                )
                return

            comp_id = str(row[0])
            component_type = row[2] or "text"
            raw_content = row[3] or ""

            summary = await summarize_component(raw_content, component_type)

            await db.execute(
                text(
                    "INSERT INTO summary_embeddings "
                    "(doc_id, component_type, summary_text, source_page, embedding) "
                    "VALUES (:doc_id, :ctype, :summary, :page, NULL::vector)"
                ),
                {
                    "doc_id": comp_id,
                    "ctype": component_type,
                    "summary": summary,
                    "page": row[5],
                },
            )
            await db.commit()

            logger.info(
                "Generated summary for component %s (%s)", comp_id, component_type,
            )

            result2 = await db.execute(
                text(
                    "SELECT id FROM summary_embeddings "
                    "WHERE doc_id = :doc_id AND summary_text = :summary "
                    "ORDER BY created_at DESC LIMIT 1"
                ),
                {"doc_id": comp_id, "summary": summary},
            )
            se_row = result2.fetchone()
            if se_row:
                from app.tasks.embedding_tasks import generate_embedding_task
                generate_embedding_task.delay(str(se_row[0]))

    asyncio.run(_summarize())

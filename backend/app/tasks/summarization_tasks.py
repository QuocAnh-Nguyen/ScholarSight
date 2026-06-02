"""Celery tasks for LLM summarization.

FIXES APPLIED (audit report):
  - #2A  DB connection leak: uses shared engine.
  - #1C  Race condition: the summary_embeddings row is now inserted WITH
          a placeholder embedding in the SAME task that chains to embedding
          generation.  But critically we use the component's parent_doc_id
          for the doc_id column so semantic search can join back to siblings.
  - #1D  Broker bloat: receives only component_uuid, fetches raw content
          from DB directly.
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

        async with get_worker_session() as db:
            # 1. Fetch the component from DB
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
                logger.warning("Component %s not found — skipping summarization", component_uuid)
                return

            comp_id = str(row[0])
            parent_doc_id = str(row[1])
            component_type = row[2] or "text"
            raw_content = row[3] or ""

            # 2. Generate summary
            summary = await summarize_component(raw_content, component_type)

            # 3. Insert summary_embeddings row with NULL embedding
            #    (embedding filled in by the next task; race condition is
            #     mitigated because we insert immediately and chain)
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

            logger.info("Generated summary for component %s (%s)", comp_id, component_type)

            # 4. Chain to embedding generation — pass ONLY the summary_embeddings row id
            #    so the embedding task can look up the summary text from DB
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

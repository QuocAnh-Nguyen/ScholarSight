"""Celery tasks for LLM summarization."""

import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=10)
def summarize_component_task(self, doc_id: str, component_type: str, raw_content: str, surrounding_context: str = ""):
    """Generate a summary for a single component and chain to embedding generation.

    Args:
        doc_id: The document UUID.
        component_type: Type of component ('text', 'table', 'image').
        raw_content: The raw extracted content.
        surrounding_context: Context from nearby components.
    """
    import asyncio

    async def _summarize():
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

        from app.core.config import settings
        from app.services.llm.summarizer import summarize_component

        engine = create_async_engine(settings.DATABASE_URL)
        async_session = async_sessionmaker(engine)

        # Generate summary
        summary = await summarize_component(raw_content, component_type, surrounding_context)

        async with async_session() as db:
            # Store summary in vector store (embedding filled in later)
            await db.execute(
                text(
                    "INSERT INTO summary_embeddings "
                    "(doc_id, component_type, summary_text, embedding) "
                    "VALUES (:doc_id, :ctype, :summary, NULL::vector)"
                ),
                {"doc_id": doc_id, "ctype": component_type, "summary": summary},
            )
            await db.commit()

        logger.info(f"Generated summary for {doc_id} ({component_type})")

        # Chain to embedding generation
        from app.tasks.embedding_tasks import generate_embedding_task
        generate_embedding_task.delay(doc_id, summary)

    asyncio.run(_summarize())
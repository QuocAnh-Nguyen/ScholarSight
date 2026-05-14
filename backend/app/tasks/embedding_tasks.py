"""Celery tasks for BGE-M3 embedding generation."""

import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def generate_embedding_task(self, doc_id: str, summary_text: str):
    """Generate BGE-M3 embedding for a summary and update the vector store.

    Args:
        doc_id: The document UUID.
        summary_text: The summary text to embed.
    """
    import asyncio

    async def _embed():
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

        from app.core.config import settings
        from app.services.embedding.bge_m3 import get_query_embedding

        engine = create_async_engine(settings.DATABASE_URL)
        async_session = async_sessionmaker(engine)

        # Generate embedding
        embedding = await get_query_embedding(summary_text)

        # Format for pgvector
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

        async with async_session() as db:
            await db.execute(
                text(
                    "UPDATE summary_embeddings "
                    "SET embedding = :emb::vector "
                    "WHERE doc_id = :doc_id AND summary_text = :summary"
                ),
                {"emb": embedding_str, "doc_id": doc_id, "summary": summary_text},
            )
            await db.commit()

        logger.info(f"Generated embedding for {doc_id}")

    asyncio.run(_embed())
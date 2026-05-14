"""Semantic search service using pgvector."""

import logging
from typing import List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def semantic_search(
    db: AsyncSession,
    query_embedding: List[float],
    top_k: int = 5,
    threshold: float = 0.75,
) -> list[dict]:
    """Perform semantic search on summary_embeddings using cosine similarity.

    Args:
        db: Async database session.
        query_embedding: 1024-dim query embedding vector.
        top_k: Number of top results to return.
        threshold: Minimum cosine similarity threshold.

    Returns:
        List of matching results with doc_id, summary, score, etc.
    """
    # Convert embedding to pgvector format
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    result = await db.execute(
        text(
            """
            SELECT
                doc_id,
                component_type,
                summary_text,
                source_page,
                university_name,
                academic_year,
                1 - (embedding <=> :emb::vector) AS cosine_score
            FROM summary_embeddings
            WHERE 1 - (embedding <=> :emb::vector) > :threshold
            ORDER BY embedding <=> :emb::vector ASC
            LIMIT :top_k
            """
        ),
        {"emb": embedding_str, "threshold": threshold, "top_k": top_k},
    )

    rows = result.fetchall()
    results = []
    for row in rows:
        results.append({
            "doc_id": str(row[0]),
            "component_type": row[1],
            "summary_text": row[2],
            "source_page": row[3],
            "university_name": row[4],
            "academic_year": row[5],
            "score": float(row[6]),
        })

    logger.info(f"Semantic search returned {len(results)} results (threshold={threshold})")
    return results

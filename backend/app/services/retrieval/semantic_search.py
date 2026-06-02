"""Semantic search service using pgvector.

FIXES APPLIED (audit report):
  - #1A  Small-to-Big support: returns component-level doc_id (UUID of
          raw_components row) which downstream context_retriever maps to
          parent_doc_id for sibling-fetching.
  - Filtering: explicitly excludes rows with NULL embeddings to avoid
          pgvector errors from the race-condition period.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def semantic_search(
    db: AsyncSession,
    query_embedding: list[float],
    top_k: int = 5,
    threshold: float = 0.75,
) -> list[dict]:
    """Perform semantic search on summary_embeddings using cosine similarity.

    Returns component-level doc_id (summary_embeddings.doc_id references
    raw_components.id).  The context_retriever then maps these to
    parent_doc_id for Small-to-Big sibling retrieval.

    Args:
        db: Async database session.
        query_embedding: 1024-dim query embedding vector.
        top_k: Number of top results to return.
        threshold: Minimum cosine similarity threshold.

    Returns:
        List of matching results with doc_id, summary, score, etc.
    """
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
            WHERE embedding IS NOT NULL
              AND 1 - (embedding <=> :emb::vector) > :threshold
            ORDER BY embedding <=> :emb::vector ASC
            LIMIT :top_k
            """
        ),
        {"emb": embedding_str, "threshold": threshold, "top_k": top_k},
    )

    rows = result.fetchall()
    results: list[dict] = []
    for row in rows:
        results.append({
            "doc_id": str(row[0]),          # raw_components UUID (the "small")
            "component_type": row[1],
            "summary_text": row[2],
            "source_page": row[3],
            "university_name": row[4],
            "academic_year": row[5],
            "score": float(row[6]),
        })

    logger.info(
        "Semantic search returned %d results (threshold=%.2f, top_k=%d)",
        len(results), threshold, top_k,
    )
    return results

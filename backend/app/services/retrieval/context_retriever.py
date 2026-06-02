"""Context group retrieval service (Small-to-Big pattern).

FIXES APPLIED (audit report):
  - #1A  Broken Small-to-Big: semantic search on summary_embeddings returns
          individual component UUIDs (*small*).  This service joins back
          through parent_doc_id to fetch ALL sibling components from the
          same document (*big*), restoring the intended retrieval pattern.
"""

from __future__ import annotations

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def retrieve_context_groups(
    db: AsyncSession,
    doc_ids: list[str],
) -> list[dict]:
    """Retrieve full context groups for a list of component doc_ids.

    Implements "Small-to-Big" retrieval:
      1. Semantic search matches a summary (small chunk) → returns a
         summary_embeddings.doc_id (which is a raw_components UUID).
      2. This function maps each matched component UUID to its parent_doc_id
         (the documents row UUID), then fetches ALL sibling components
         belonging to that parent document (the big context).

    Args:
        db: Async database session.
        doc_ids: List of raw_components UUIDs from semantic search.

    Returns:
        List of context groups, one per unique parent document.
        Each group contains all raw components for that document.
    """
    if not doc_ids:
        return []

    unique_ids = list(set(doc_ids))

    # Step 1: map component UUIDs → parent_doc_id (the "big" grouping key)
    placeholders = ", ".join(f":id_{i}" for i in range(len(unique_ids)))
    params: dict = {f"id_{i}": uid for i, uid in enumerate(unique_ids)}

    result = await db.execute(
        text(
            f"""
            SELECT DISTINCT parent_doc_id
            FROM raw_components
            WHERE id IN ({placeholders})
            """
        ),
        params,
    )
    parent_ids = [str(row[0]) for row in result.fetchall()]

    if not parent_ids:
        logger.warning("No parent_doc_id found for component ids: %s", unique_ids)
        return []

    # Step 2: fetch ALL sibling components for those parent documents
    p_placeholders = ", ".join(f":pid_{i}" for i in range(len(parent_ids)))
    p_params: dict = {f"pid_{i}": pid for i, pid in enumerate(parent_ids)}

    result = await db.execute(
        text(
            f"""
            SELECT
                id,
                parent_doc_id,
                component_type,
                raw_content,
                image_url,
                table_structure,
                source_file,
                source_page,
                university_name,
                academic_year
            FROM raw_components
            WHERE parent_doc_id IN ({p_placeholders})
            ORDER BY parent_doc_id, source_page, component_type
            """
        ),
        p_params,
    )

    rows = result.fetchall()

    # Group by parent_doc_id
    groups: dict[str, dict] = {}
    for row in rows:
        parent = str(row[1])
        if parent not in groups:
            groups[parent] = {"doc_id": parent, "components": []}
        groups[parent]["components"].append({
            "component_id": str(row[0]),
            "component_type": row[2],
            "raw_content": row[3],
            "image_url": row[4],
            "table_structure": row[5],
            "source_file": row[6],
            "source_page": row[7],
            "university_name": row[8],
            "academic_year": row[9],
        })

    context_groups = list(groups.values())
    logger.info(
        "Small-to-Big: %d component ids → %d parent docs → %d total components",
        len(unique_ids), len(context_groups), len(rows),
    )
    return context_groups

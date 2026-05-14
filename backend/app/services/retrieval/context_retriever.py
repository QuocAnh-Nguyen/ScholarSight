"""Context group retrieval service (Small-to-Big pattern)."""

import logging
from typing import List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def retrieve_context_groups(
    db: AsyncSession,
    doc_ids: List[str],
) -> list[dict]:
    """Retrieve full context groups for a list of doc_ids.

    Given doc_ids from semantic search on summaries, fetches ALL associated
    raw components from raw_components table. This implements the "Small-to-Big"
    retrieval pattern: summaries for fast search, then full originals for the LLM.

    Args:
        db: Async database session.
        doc_ids: List of doc_id strings from semantic search.

    Returns:
        List of context groups, each containing all raw components for a doc_id.
    """
    if not doc_ids:
        return []

    # Deduplicate
    unique_ids = list(set(doc_ids))

    # Fetch all raw components for these doc_ids
    placeholders = ", ".join(f":id_{i}" for i in range(len(unique_ids)))
    params = {f"id_{i}": uid for i, uid in enumerate(unique_ids)}

    result = await db.execute(
        text(
            f"""
            SELECT
                doc_id,
                component_type,
                raw_content,
                image_url,
                table_structure,
                source_file,
                source_page,
                university_name,
                academic_year
            FROM raw_components
            WHERE doc_id IN ({placeholders})
            ORDER BY doc_id, source_page, component_type
            """
        ),
        params,
    )

    rows = result.fetchall()

    # Group by doc_id
    groups: dict[str, dict] = {}
    for row in rows:
        doc_id = str(row[0])
        if doc_id not in groups:
            groups[doc_id] = {
                "doc_id": doc_id,
                "components": [],
            }
        groups[doc_id]["components"].append({
            "component_type": row[1],
            "raw_content": row[2],
            "image_url": row[3],
            "table_structure": row[4],
            "source_file": row[5],
            "source_page": row[6],
            "university_name": row[7],
            "academic_year": row[8],
        })

    context_groups = list(groups.values())
    logger.info(f"Retrieved {len(context_groups)} context groups with {len(rows)} total components")
    return context_groups

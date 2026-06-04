"""Query routes - RAG-powered Q&A with source citations.

FIXES APPLIED:
  - #1B  Disconnected source citations: filtered to LLM-cited ids only.
  - #3   Broken citation linkage: the LLM cites parent_doc_id (the "big"
          document UUID shown in the prompt), not component UUIDs.  We now
          build a parent_doc_id → search-metadata reverse mapping via a
          lightweight DB query, so parent citations resolve correctly.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

DISCLAIMER = (
    "⚠️ Đây là công cụ phân tích và gợi ý. "
    "Quyết định cuối cùng thuộc về bạn."
)

HIGH_RISK_KEYWORDS = [
    "guarantee", "chắc chắn đỗ", "đảm bảo", "cam kết", "100%",
    "ưu tiên khu vực", "cộng điểm", "diện đặc cách",
]


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    threshold: float = 0.75


class SourceCitation(BaseModel):
    doc_id: str
    component_type: str
    summary: str
    image_url: str | None = None
    cosine_score: float


class QueryResponse(BaseModel):
    answer: str
    disclaimer: str = DISCLAIMER
    citations: list[SourceCitation]
    human_fallback: bool = False
    fallback_reason: str | None = None


@router.post("", response_model=QueryResponse)
async def submit_query(
    body: QueryRequest,
    user_id: str | None = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    """Submit a query to the RAG pipeline."""
    query_lower = body.query.lower()
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in query_lower:
            return QueryResponse(
                answer="Câu hỏi này cần tư vấn chuyên sâu từ chuyên gia.",
                citations=[],
                human_fallback=True,
                fallback_reason=(
                    f"Phát hiện từ khóa nhạy cảm: '{keyword}'. "
                    "Vui lòng liên hệ chuyên gia tư vấn."
                ),
            )

    # Step 1: Vectorize
    from app.services.embedding.bge_m3 import get_query_embedding

    try:
        query_embedding = await get_query_embedding(body.query)
    except Exception as e:
        logger.error("Embedding service error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service unavailable",
        )

    # Step 2: Semantic search → returns component-level doc_ids ("small")
    from app.services.retrieval.semantic_search import semantic_search

    search_results = await semantic_search(
        db, query_embedding, top_k=body.top_k, threshold=body.threshold,
    )

    if not search_results:
        return QueryResponse(
            answer=(
                "Xin lỗi, tôi không tìm thấy thông tin phù hợp trong cơ sở dữ liệu. "
                "Vui lòng thử diễn đạt lại câu hỏi hoặc liên hệ chuyên gia."
            ),
            citations=[],
            human_fallback=True,
            fallback_reason=(
                "Không tìm thấy tài liệu phù hợp "
                "(cosine similarity dưới ngưỡng)."
            ),
        )

    # ------------------------------------------------------------------
    # FIX #3: Build TWO lookups:
    #   search_lookup:  component_uuid → search metadata  (for fallback)
    #   parent_lookup:  parent_doc_id  → best search metadata
    #
    # The LLM prompt uses [Tài liệu: parent_doc_id], so cited_doc_ids
    # are parent-level UUIDs.  We resolve them via parent_lookup.
    # ------------------------------------------------------------------
    component_uuids: list[str] = [r["doc_id"] for r in search_results]
    search_lookup: dict[str, dict] = {
        r["doc_id"]: r for r in search_results
    }

    # Query the DB to map component_uuids → parent_doc_id
    parent_map: dict[str, str] = {}  # component_uuid → parent_doc_id
    if component_uuids:
        placeholders = ", ".join(
            f":c{i}" for i in range(len(component_uuids))
        )
        params = {f"c{i}": uid for i, uid in enumerate(component_uuids)}
        rows = await db.execute(
            text(
                f"SELECT id, parent_doc_id FROM raw_components "
                f"WHERE id IN ({placeholders})"
            ),
            params,
        )
        for row in rows.fetchall():
            parent_map[str(row[0])] = str(row[1])

    # parent_lookup: parent_doc_id → best (highest-score) search metadata
    parent_lookup: dict[str, dict] = {}
    for r in search_results:
        pid = parent_map.get(r["doc_id"])
        if pid is None:
            continue
        if pid not in parent_lookup or r["score"] > parent_lookup[pid]["score"]:
            parent_lookup[pid] = r

    # Step 3: Small-to-Big context retrieval
    from app.services.retrieval.context_retriever import retrieve_context_groups

    context_groups = await retrieve_context_groups(db, component_uuids)

    # Step 4: Synthesize answer — cited_doc_ids are parent_doc_id values
    from app.services.llm.synthesizer import synthesize_answer

    answer, cited_doc_ids = await synthesize_answer(body.query, context_groups)

    # ------------------------------------------------------------------
    # Resolve citations: map each cited parent_doc_id → search metadata
    # via parent_lookup.  Fall back to search_lookup if parent not found.
    # ------------------------------------------------------------------
    effective_cited: set[str]
    if cited_doc_ids:
        effective_cited = set(cited_doc_ids)
    else:
        # No citations extracted → fall back to all parent_ids
        effective_cited = set(parent_lookup.keys())

    citations: list[SourceCitation] = []
    seen: set[str] = set()

    for cid in effective_cited:
        if cid in seen:
            continue

        # Try parent_lookup first (cid is a parent_doc_id)
        meta = parent_lookup.get(cid)
        if meta is None:
            # Maybe the LLM cited a component UUID directly — try search_lookup
            meta = search_lookup.get(cid)

        if meta is None:
            logger.debug("Cited id %s not found in either lookup — skipping", cid)
            continue

        seen.add(cid)
        citations.append(
            SourceCitation(
                doc_id=cid,  # parent_doc_id for frontend reference
                component_type=meta["component_type"],
                summary=meta["summary_text"],
                image_url=meta.get("image_url"),
                cosine_score=meta["score"],
            )
        )

    # Store query history
    if user_id:
        try:
            await db.execute(
                text(
                    "INSERT INTO query_history "
                    "(user_id, query_text, retrieved_doc_ids, synthesized_answer, "
                    " source_citations, cosine_scores) "
                    "VALUES (:uid, :q, :docs, :ans, :cit, :scores)"
                ),
                {
                    "uid": user_id,
                    "q": body.query,
                    "docs": list(seen),
                    "ans": answer,
                    "cit": None,
                    "scores": [r["score"] for r in search_results],
                },
            )
        except Exception:
            logger.warning("Failed to store query history", exc_info=True)

    return QueryResponse(
        answer=f"{DISCLAIMER}\n\n{answer}",
        citations=citations,
    )

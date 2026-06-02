"""Query routes - RAG-powered Q&A with source citations.

FIXES APPLIED (audit report):
  - #1B  Disconnected source citations: the route now filters citations to
          only those doc_ids the LLM actually cited (from synthesize_answer),
          using the semantic search results to look up the metadata.
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

    # Step 2: Semantic search
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

    # Build lookup: component_uuid → search metadata
    search_lookup: dict[str, dict] = {
        r["doc_id"]: r for r in search_results
    }

    # Step 3: Small-to-Big context retrieval
    from app.services.retrieval.context_retriever import retrieve_context_groups

    component_uuids = list(search_lookup.keys())
    context_groups = await retrieve_context_groups(db, component_uuids)

    # Step 4: Synthesize answer
    from app.services.llm.synthesizer import synthesize_answer

    # Note: cited_doc_ids are component-level UUIDs that the LLM actually used
    answer, cited_doc_ids = await synthesize_answer(body.query, context_groups)

    # ------------------------------------------------------------------
    # FIX 1B: Only include citations that the LLM actually cited.
    # Build a lookup from parent_doc_id → component_uuid for cited ids.
    # If cited_doc_ids is empty (regex missed), fall back to all search
    # results to avoid a silent empty-citation UX bug.
    # ------------------------------------------------------------------
    effective_cited = set(cited_doc_ids) if cited_doc_ids else set(search_lookup.keys())

    citations: list[SourceCitation] = []
    cited_set: set[str] = set()

    for cid in effective_cited:
        meta = search_lookup.get(cid)
        if meta is None:
            # The cited id might be a parent_doc_id from older rows —
            # still try to derive something useful.
            logger.debug("Cited doc_id %s not in search results — skipping citation", cid)
            continue
        if cid in cited_set:
            continue
        cited_set.add(cid)
        citations.append(
            SourceCitation(
                doc_id=meta["doc_id"],
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
                    "docs": list(cited_set),
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

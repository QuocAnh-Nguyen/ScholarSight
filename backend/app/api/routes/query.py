"""Query routes - RAG-powered Q&A with source citations."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

DISCLAIMER = "⚠️ Đây là công cụ phân tích và gợi ý. Quyết định cuối cùng thuộc về bạn."

# Keywords that trigger human fallback
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
    image_url: Optional[str] = None
    cosine_score: float


class QueryResponse(BaseModel):
    answer: str
    disclaimer: str = DISCLAIMER
    citations: list[SourceCitation]
    human_fallback: bool = False
    fallback_reason: Optional[str] = None


@router.post("", response_model=QueryResponse)
async def submit_query(
    body: QueryRequest,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    """Submit a query to the RAG pipeline.

    Orchestrates: query vectorization → semantic search → context retrieval → answer synthesis.
    Returns answer with inline source citations and image URLs.
    """
    # Check for high-risk keywords → human fallback
    query_lower = body.query.lower()
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in query_lower:
            return QueryResponse(
                answer="Câu hỏi này cần tư vấn chuyên sâu từ chuyên gia.",
                citations=[],
                human_fallback=True,
                fallback_reason=f"Phát hiện từ khóa nhạy cảm: '{keyword}'. Vui lòng liên hệ chuyên gia tư vấn.",
            )

    # Step 1: Vectorize the query
    from app.services.embedding.bge_m3 import get_query_embedding

    try:
        query_embedding = await get_query_embedding(body.query)
    except Exception as e:
        logger.error(f"Embedding service error: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Embedding service unavailable")

    # Step 2: Semantic search
    from app.services.retrieval.semantic_search import semantic_search

    search_results = await semantic_search(db, query_embedding, top_k=body.top_k, threshold=body.threshold)

    # Check if all scores are below threshold → human fallback
    if not search_results:
        return QueryResponse(
            answer="Xin lỗi, tôi không tìm thấy thông tin phù hợp trong cơ sở dữ liệu. Vui lòng thử diễn đạt lại câu hỏi hoặc liên hệ chuyên gia.",
            citations=[],
            human_fallback=True,
            fallback_reason="Không tìm thấy tài liệu phù hợp (cosine similarity dưới ngưỡng).",
        )

    # Step 3: Retrieve full context groups
    from app.services.retrieval.context_retriever import retrieve_context_groups

    doc_ids = [r["doc_id"] for r in search_results]
    context_groups = await retrieve_context_groups(db, doc_ids)

    # Step 4: Construct prompt and synthesize answer
    from app.services.llm.synthesizer import synthesize_answer

    answer, cited_doc_ids = await synthesize_answer(body.query, context_groups)

    # Build citations
    citations = []
    for result in search_results:
        citations.append(
            SourceCitation(
                doc_id=result["doc_id"],
                component_type=result["component_type"],
                summary=result["summary_text"],
                image_url=result.get("image_url"),
                cosine_score=result["score"],
            )
        )

    # Store query history
    if user_id:
        try:
            await db.execute(
                text(
                    "INSERT INTO query_history (user_id, query_text, retrieved_doc_ids, synthesized_answer, source_citations, cosine_scores) "
                    "VALUES (:uid, :q, :docs, :ans, :cit, :scores)"
                ),
                {
                    "uid": user_id,
                    "q": body.query,
                    "docs": doc_ids,
                    "ans": answer,
                    "cit": None,  # Could serialize citations as JSON
                    "scores": [r["score"] for r in search_results],
                },
            )
        except Exception as e:
            logger.warning(f"Failed to store query history: {e}")

    return QueryResponse(
        answer=f"{DISCLAIMER}\n\n{answer}",
        citations=citations,
    )

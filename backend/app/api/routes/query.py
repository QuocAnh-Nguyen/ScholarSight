"""Query routes - RAG-powered Q&A with source citations.

FIXES APPLIED:
  - #1B  Disconnected source citations: filtered to LLM-cited ids only.
  - #3   Broken citation linkage: the LLM cites parent_doc_id (the "big"
          document UUID shown in the prompt), not component UUIDs.  We now
          build a parent_doc_id → search-metadata reverse mapping via a
          lightweight DB query, so parent citations resolve correctly.
  - #1A  SSE streaming endpoint: POST /api/query/stream emits SSE tokens
          for the chat UI, reusing the same RAG pipeline as the sync endpoint.
"""

from __future__ import annotations

import asyncio
import json as _json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
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

# ------------------------------------------------------------------
# Shared RAG pipeline — used by both sync and streaming endpoints.
# ------------------------------------------------------------------

class _PipelineResult:
    """Internal result from the RAG pipeline before formatting."""
    __slots__ = ("answer", "citations", "human_fallback", "fallback_reason",
                 "search_results", "seen_doc_ids")

    def __init__(self, answer, citations, human_fallback, fallback_reason,
                 search_results, seen_doc_ids):
        self.answer = answer
        self.citations = citations
        self.human_fallback = human_fallback
        self.fallback_reason = fallback_reason
        self.search_results = search_results
        self.seen_doc_ids = seen_doc_ids


async def _run_rag_pipeline(
    body: QueryRequest,
    user_id: str | None,
    db: AsyncSession,
) -> _PipelineResult:
    """Execute the full RAG pipeline and return a _PipelineResult."""
    query_lower = body.query.lower()
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in query_lower:
            return _PipelineResult(
                answer="Câu hỏi này cần tư vấn chuyên sâu từ chuyên gia.",
                citations=[],
                human_fallback=True,
                fallback_reason=(
                    f"Phát hiện từ khóa nhạy cảm: '{keyword}'. "
                    "Vui lòng liên hệ chuyên gia tư vấn."
                ),
                search_results=[],
                seen_doc_ids=set(),
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
        return _PipelineResult(
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
            search_results=[],
            seen_doc_ids=set(),
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

    result = _PipelineResult(
        answer=answer,
        citations=citations,
        human_fallback=False,
        fallback_reason=None,
        search_results=search_results,
        seen_doc_ids=seen,
    )
    return result


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.post("", response_model=QueryResponse)
async def submit_query(
    body: QueryRequest,
    user_id: str | None = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    """Submit a query to the RAG pipeline (synchronous JSON response)."""
    result = await _run_rag_pipeline(body, user_id, db)

    return QueryResponse(
        answer=f"{DISCLAIMER}\n\n{result.answer}",
        citations=result.citations,
        human_fallback=result.human_fallback,
        fallback_reason=result.fallback_reason,
    )


# ------------------------------------------------------------------
# SSE STREAMING ENDPOINT  (Fix #1A)
#
# The frontend ChatMessages + useChat expect POST /api/query/stream
# returning text/event-stream.  We run the same RAG pipeline but
# emit the answer sentence-by-sentence as SSE "token" events,
# followed by a "complete" event with citations.
# ------------------------------------------------------------------

SSE_TOKEN_SEPARATORS = (". ", "。 ", ".\n", "。\n", "\n")


def _split_into_tokens(text: str) -> list[str]:
    """Split answer text into sentence-level tokens for SSE streaming."""
    tokens: list[str] = []
    remaining = text
    while remaining:
        best = -1
        best_len = 0
        for sep in SSE_TOKEN_SEPARATORS:
            idx = remaining.find(sep)
            if idx != -1:
                end = idx + len(sep)
                if best == -1 or idx < best:
                    best = idx
                    best_len = len(sep)
        if best == -1:
            tokens.append(remaining)
            break
        tokens.append(remaining[:best + best_len])
        remaining = remaining[best + best_len:]
    return tokens


@router.post("/stream")
async def submit_query_stream(
    body: QueryRequest,
    user_id: str | None = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Submit a query and stream the answer via Server-Sent Events."""
    result = await _run_rag_pipeline(body, user_id, db)

    full_answer = f"{DISCLAIMER}\n\n{result.answer}"
    tokens = _split_into_tokens(full_answer)

    async def event_generator():
        # Emit each sentence as a "token" event
        for tok in tokens:
            payload = _json.dumps({"type": "token", "content": tok}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0)  # yield to the event loop

        # Emit completion metadata
        citations_payload = [
            {
                "doc_id": c.doc_id,
                "component_type": c.component_type,
                "summary": c.summary,
                "image_url": c.image_url,
                "cosine_score": c.cosine_score,
            }
            for c in result.citations
        ]
        complete = _json.dumps(
            {
                "type": "complete",
                "citations": citations_payload,
                "human_fallback": result.human_fallback,
            },
            ensure_ascii=False,
        )
        yield f"data: {complete}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

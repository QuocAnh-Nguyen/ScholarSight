"""LLM answer synthesis service for the RAG pipeline.

FIXES APPLIED (audit report):
  - #2B  Broken regex: the original pattern only matched bare UUIDs in
          brackets like [uuid]. The system prompt instructs the
          LLM to output "[Tài liệu: {doc_id}]", so the regex now supports
          both formats: bare [uuid] and [Tài liệu: uuid].
"""

from __future__ import annotations

import logging
import re

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


SYNTHESIS_SYSTEM_PROMPT = """Bạn là ScholarSight — trợ lý tư vấn tuyển sinh đại học Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên tài liệu được cung cấp bên dưới. KHÔNG bịa đặt thông tin.
2. Khi trích dẫn thông tin, PHẢI ghi rõ nguồn bằng [doc_id] tương ứng.
3. Nếu tài liệu không đủ để trả lời, nói rõ: "Tôi không tìm thấy thông tin này trong tài liệu hiện có."
4. Trả lời bằng tiếng Việt tự nhiên, rõ ràng, dễ hiểu.
5. Khi có bảng điểm hoặc dữ liệu số, trình bày dưới dạng bảng markdown.
6. Luôn kết thúc bằng lời nhắc: nội dung chỉ mang tính tham khảo.

QUAN TRỌNG: Đây là công cụ phân tích và gợi ý. Quyết định cuối cùng thuộc về người dùng."""

# ------------------------------------------------------------------
# FIX 2B: Regex that matches BOTH bare [uuid] AND [Tài liệu: uuid].
# UUID pattern: 8-4-4-4-12 hex digits, optionally prefixed by label.
# ------------------------------------------------------------------
_CITATION_RE = re.compile(
    r"\[(?:Tài\s*liệu\s*:\s*)?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]"
)


async def synthesize_answer(
    query: str,
    context_groups: list[dict],
) -> tuple[str, list[str]]:
    """Synthesize an answer using LLM with retrieved context.

    Args:
        query: User's query text.
        context_groups: List of context groups from Small-to-Big retrieval.

    Returns:
        Tuple of (answer_text, list_of_cited_doc_ids).
    """
    client = _get_client()

    # Build context section
    context_parts: list[str] = []
    for group in context_groups:
        doc_id = group["doc_id"]
        parts = [f"[Tài liệu: {doc_id}]"]

        for component in group.get("components", []):
            ctype = component.get("component_type", "text")
            if ctype == "text":
                parts.append(f"Nội dung: {component.get('raw_content', '')}")
            elif ctype == "table":
                parts.append(
                    f"Bảng dữ liệu: {component.get('table_structure', component.get('raw_content', ''))}"
                )
            elif ctype == "image":
                parts.append(f"[Hình ảnh - URL: {component.get('image_url', 'N/A')}]")

            if component.get("university_name"):
                parts.append(f"Trường: {component['university_name']}")
            if component.get("academic_year"):
                parts.append(f"Năm: {component['academic_year']}")

        context_parts.append("\n".join(parts))

    context_text = "\n\n---\n\n".join(context_parts)

    user_message = (
        f"TÀI LIỆU THAM KHẢO:\n"
        f"{context_text}\n\n"
        f"CÂU HỎI CỦA HỌC SINH:\n"
        f"{query}\n\n"
        f"Hãy trả lời câu hỏi dựa trên tài liệu trên. "
        f"Nhớ trích dẫn nguồn [doc_id] khi sử dụng thông tin."
    )

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=2000,
        temperature=0.4,
    )

    answer = response.choices[0].message.content or ""

    cited_ids = _CITATION_RE.findall(answer)
    logger.debug("Extracted %d cited doc_ids from LLM answer", len(cited_ids))

    return answer.strip(), cited_ids

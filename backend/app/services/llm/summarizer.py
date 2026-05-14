"""LLM summarization service for ingestion pipeline."""

import logging
from typing import Optional

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncOpenAI] = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


SUMMARIZATION_SYSTEM_PROMPT = """Bạn là trợ lý chuyên tóm tắt tài liệu tuyển sinh đại học Việt Nam.

Nhiệm vụ: Tóm tắt ngắn gọn nội dung được cung cấp, tập trung vào:
- Thông tin tuyển sinh (chỉ tiêu, điểm chuẩn, phương thức xét tuyển)
- Thông tin ngành học (mã ngành, tổ hợp môn)
- Thời gian và quy trình nộp hồ sơ
- Học phí và chính sách hỗ trợ

Tóm tắt bằng tiếng Việt, giữ lại tất cả số liệu và thông tin quan trọng.
Tóm tắt trong 2-3 câu ngắn gọn."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
async def summarize_component(
    content: str,
    component_type: str,
    surrounding_context: str = "",
) -> str:
    """Generate a concise summary of a document component.

    Args:
        content: The raw content of the component.
        component_type: Type of component ('text', 'table', 'image').
        surrounding_context: Text from surrounding components for context.

    Returns:
        Summary text in Vietnamese.
    """
    client = _get_client()

    user_message = f"Loại nội dung: {component_type}\n\n"
    if surrounding_context:
        user_message += f"Ngữ cảnh xung quanh:\n{surrounding_context}\n\n"
    user_message += f"Nội dung cần tóm tắt:\n{content}"

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL_MINI,
        messages=[
            {"role": "system", "content": SUMMARIZATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=300,
        temperature=0.3,
    )

    summary = response.choices[0].message.content or ""
    logger.debug(f"Generated summary ({len(summary)} chars) for {component_type}")
    return summary.strip()

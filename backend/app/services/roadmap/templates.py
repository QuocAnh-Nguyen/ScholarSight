"""Roadmap templates and AI suggestion generation.

FIXES APPLIED (audit report):
  - #3B  Missing AI-Powered Kanban integration: replaced the hardcoded mock
          `generate_suggestions` with a real LLM call that generates
          personalized milestones based on the user's grade and target
          universities.  Falls back gracefully to static templates when
          the LLM is unavailable.
"""

from __future__ import annotations

import json as _json
import logging
from datetime import datetime

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Static fallback template (used when LLM is unavailable or for < 5 results)
# ---------------------------------------------------------------------------
_DEFAULT_MILESTONES: list[dict] = [
    {
        "title": "Tháng 1-2: Xác định ngành học & trường mục tiêu",
        "description": "Nghiên cứu ngành học phù hợp, lập danh sách 3-5 trường đại học mục tiêu. "
                       "Tìm hiểu phương thức tuyển sinh của từng trường.",
        "due_month": 2,
        "category": "application",
    },
    {
        "title": "Tháng 3: Ôn thi chuẩn hóa",
        "description": "Đăng ký và ôn luyện các kỳ thi chuẩn hóa (IELTS/TOEFL, ĐGNL, SAT nếu cần). "
                       "Lên lịch học tập chi tiết.",
        "due_month": 3,
        "category": "exam_prep",
    },
    {
        "title": "Tháng 4: Chuẩn bị hồ sơ xét tuyển",
        "description": "Chuẩn bị học bạ công chứng, ảnh, giấy tờ tùy thân. "
                       "Viết bài luận cá nhân (nếu cần).",
        "due_month": 4,
        "category": "document",
    },
    {
        "title": "Tháng 5: Nộp hồ sơ đợt 1",
        "description": "Hoàn thiện đăng ký nguyện vọng trên hệ thống của Bộ GD&ĐT. "
                       "Nộp hồ sơ xét tuyển riêng (nếu có).",
        "due_month": 5,
        "category": "application",
    },
    {
        "title": "Tháng 6: Thi THPT Quốc gia",
        "description": "Tập trung ôn tập giai đoạn cuối. "
                       "Chuẩn bị tâm lý và giấy tờ cần thiết cho kỳ thi.",
        "due_month": 6,
        "category": "exam_prep",
    },
    {
        "title": "Tháng 7: Công bố điểm thi",
        "description": "Theo dõi công bố điểm thi. "
                       "Đánh giá kết quả và điều chỉnh nguyện vọng nếu cần.",
        "due_month": 7,
        "category": "application",
    },
    {
        "title": "Tháng 8: Điều chỉnh nguyện vọng & xác nhận nhập học",
        "description": "Điều chỉnh nguyện vọng trong thời gian cho phép. "
                       "Xác nhận nhập học online khi có kết quả trúng tuyển.",
        "due_month": 8,
        "category": "application",
    },
    {
        "title": "Tháng 8-9: Chuẩn bị tài chính",
        "description": "Nộp học phí đợt 1, tìm hiểu về học bổng, "
                       "vay tín dụng sinh viên nếu cần.",
        "due_month": 8,
        "category": "financial",
    },
    {
        "title": "Tháng 9: Nhập học",
        "description": "Hoàn thiện thủ tục nhập học. "
                       "Tham gia tuần lễ định hướng tân sinh viên.",
        "due_month": 9,
        "category": "other",
    },
]

# ---------------------------------------------------------------------------
# LLM system prompt for personalized suggestion generation
# ---------------------------------------------------------------------------
_SUGGESTION_SYSTEM_PROMPT = """Bạn là cố vấn tuyển sinh đại học Việt Nam.

Dựa trên thông tin học sinh (lớp, danh sách trường mục tiêu, tháng hiện tại),
hãy tạo một danh sách các cột mốc (milestone) cá nhân hóa để giúp học sinh
chuẩn bị hồ sơ và ôn thi hiệu quả.

Trả về DUY NHẤT một mảng JSON với schema sau (không kèm markdown, không giải thích):

[
  {
    "title": "Tiêu đề ngắn gọn (có tháng)",
    "description": "Mô tả chi tiết 1-3 câu bằng tiếng Việt",
    "due_month": 8,
    "category": "application|exam_prep|document|financial|other"
  }
]

Quy tắc:
- due_month phải >= tháng hiện tại và <= 12.
- Mỗi tháng nên có 1-3 cột mốc.
- Ưu tiên các mốc liên quan đến trường mục tiêu của học sinh.
- Tổng số cột mốc: 6-10.
- category phải là một trong: application, exam_prep, document, financial, other.
- Trả về JSON thuần túy, không bọc trong ```json```."""


def _get_client() -> AsyncOpenAI:
    """Lazily create the OpenAI client (shared key with synthesizer)."""
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


def _build_suggestion_prompt(
    grade: str | None,
    target_universities: list[str] | None,
    current_month: int,
) -> str:
    """Build the user prompt for the LLM."""
    parts: list[str] = []

    parts.append(f"Học sinh hiện đang học lớp: {grade or '12'}")
    parts.append(f"Tháng hiện tại: {current_month}")

    if target_universities:
        unis = ", ".join(target_universities[:5])
        parts.append(f"Trường đại học mục tiêu: {unis}")
    else:
        parts.append("Trường đại học mục tiêu: chưa xác định")

    parts.append(
        "\nHãy tạo danh sách cột mốc chuẩn bị tuyển sinh phù hợp "
        "với học sinh này. Chỉ trả về mảng JSON."
    )

    return "\n".join(parts)


@retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=10))
async def _llm_generate_suggestions(
    grade: str | None,
    target_universities: list[str] | None,
    current_month: int,
) -> list[dict]:
    """Call the LLM to generate personalized milestones.

    Returns parsed list of milestone dicts, or empty list on failure.
    """
    client = _get_client()

    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL_MINI,
        messages=[
            {"role": "system", "content": _SUGGESTION_SYSTEM_PROMPT},
            {"role": "user", "content": _build_suggestion_prompt(
                grade, target_universities, current_month,
            )},
        ],
        max_tokens=2000,
        temperature=0.5,
    )

    raw = (response.choices[0].message.content or "").strip()

    # Strip markdown fences if the model added them anyway
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        if raw.endswith("```"):
            raw = raw[:-3]

    try:
        suggestions = _json.loads(raw)
    except _json.JSONDecodeError:
        logger.warning("LLM returned unparseable JSON for suggestions, raw=%s...", raw[:200])
        return []

    if not isinstance(suggestions, list):
        return []

    # Validate and normalize each suggestion
    valid: list[dict] = []
    valid_categories = {"application", "exam_prep", "document", "financial", "other"}
    for item in suggestions:
        if not isinstance(item, dict):
            continue
        title = item.get("title", "")
        description = item.get("description", "")
        due_month = item.get("due_month", current_month)
        category = item.get("category", "other")

        if not title or not description:
            continue
        if not isinstance(due_month, int) or due_month < 1 or due_month > 12:
            due_month = current_month
        if category not in valid_categories:
            category = "other"

        valid.append({
            "title": str(title),
            "description": str(description),
            "due_month": due_month,
            "category": category,
        })

    return valid


async def generate_suggestions(
    grade: str | None = None,
    target_universities: list[str] | None = None,
    current_month: int | None = None,
) -> list[dict]:
    """Generate personalized task suggestions based on user profile.

    Primary path: calls the LLM (gpt-4o-mini) to produce personalized
    milestones keyed to the student's grade and target universities.

    Fallback path: uses the static Vietnamese admissions calendar template
    filtered by current month.

    Args:
        grade: Student's current grade (e.g. "12").
        target_universities: List of target university names.
        current_month: Current month number (1-12).

    Returns:
        List of suggested task dicts (title, description, due_month, category).
    """
    if current_month is None:
        current_month = datetime.now().month

    # ------------------------------------------------------------------
    # FIX 3B: Try LLM-powered personalization first.
    # ------------------------------------------------------------------
    try:
        llm_suggestions = await _llm_generate_suggestions(
            grade, target_universities, current_month,
        )
        if len(llm_suggestions) >= 5:
            logger.info(
                "LLM generated %d personalized suggestions (grade=%s, month=%d)",
                len(llm_suggestions), grade, current_month,
            )
            return llm_suggestions
        else:
            logger.info(
                "LLM returned only %d suggestions (< 5) — falling back to templates",
                len(llm_suggestions),
            )
    except Exception as exc:
        logger.warning(
            "LLM suggestion generation failed, using static templates: %s", exc,
        )

    # ------------------------------------------------------------------
    # Static fallback: filter default milestones by current month
    # ------------------------------------------------------------------
    suggestions: list[dict] = []
    for milestone in _DEFAULT_MILESTONES:
        if milestone["due_month"] >= current_month:
            suggestion = milestone.copy()
            if target_universities and milestone["category"] == "application":
                unis_str = ", ".join(target_universities[:3])
                suggestion["description"] += (
                    f"\n🏫 Trường mục tiêu của bạn: {unis_str}"
                )
            suggestions.append(suggestion)

    return suggestions

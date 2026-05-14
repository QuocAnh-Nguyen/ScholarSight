"""Roadmap templates and AI suggestion generation."""

import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Default Vietnamese admissions calendar milestones
DEFAULT_MILESTONES = [
    {
        "title": "Tháng 1-2: Xác định ngành học & trường mục tiêu",
        "description": "Nghiên cứu ngành học phù hợp, lập danh sách 3-5 trường đại học mục tiêu. Tìm hiểu phương thức tuyển sinh của từng trường.",
        "due_month": 2,
        "category": "application",
    },
    {
        "title": "Tháng 3: Ôn thi chuẩn hóa",
        "description": "Đăng ký và ôn luyện các kỳ thi chuẩn hóa (IELTS/TOEFL, ĐGNL, SAT nếu cần). Lên lịch học tập chi tiết.",
        "due_month": 3,
        "category": "exam_prep",
    },
    {
        "title": "Tháng 4: Chuẩn bị hồ sơ xét tuyển",
        "description": "Chuẩn bị học bạ công chứng, ảnh, giấy tờ tùy thân. Viết bài luận cá nhân (nếu cần).",
        "due_month": 4,
        "category": "document",
    },
    {
        "title": "Tháng 5: Nộp hồ sơ đợt 1",
        "description": "Hoàn thiện đăng ký nguyện vọng trên hệ thống của Bộ GD&ĐT. Nộp hồ sơ xét tuyển riêng (nếu có).",
        "due_month": 5,
        "category": "application",
    },
    {
        "title": "Tháng 6: Thi THPT Quốc gia",
        "description": "Tập trung ôn tập giai đoạn cuối. Chuẩn bị tâm lý và giấy tờ cần thiết cho kỳ thi.",
        "due_month": 6,
        "category": "exam_prep",
    },
    {
        "title": "Tháng 7: Công bố điểm thi",
        "description": "Theo dõi công bố điểm thi. Đánh giá kết quả và điều chỉnh nguyện vọng nếu cần.",
        "due_month": 7,
        "category": "application",
    },
    {
        "title": "Tháng 8: Điều chỉnh nguyện vọng & xác nhận nhập học",
        "description": "Điều chỉnh nguyện vọng trong thời gian cho phép. Xác nhận nhập học online khi có kết quả trúng tuyển.",
        "due_month": 8,
        "category": "application",
    },
    {
        "title": "Tháng 8-9: Chuẩn bị tài chính",
        "description": "Nộp học phí đợt 1, tìm hiểu về học bổng, vay tín dụng sinh viên nếu cần.",
        "due_month": 8,
        "category": "financial",
    },
    {
        "title": "Tháng 9: Nhập học",
        "description": "Hoàn thiện thủ tục nhập học. Tham gia tuần lễ định hướng tân sinh viên.",
        "due_month": 9,
        "category": "other",
    },
]


async def generate_suggestions(
    grade: Optional[str] = None,
    target_universities: Optional[list[str]] = None,
    current_month: Optional[int] = None,
) -> list[dict]:
    """Generate personalized task suggestions based on user profile.

    For MVP, returns template-based suggestions filtered by current month.
    Future versions will use LLM for personalized suggestions.

    Args:
        grade: Student's current grade (e.g., "12").
        target_universities: List of target university names.
        current_month: Current month number (1-12).

    Returns:
        List of suggested task dicts.
    """
    if current_month is None:
        current_month = datetime.now().month

    # Filter milestones relevant to current and upcoming months
    suggestions = []
    for milestone in DEFAULT_MILESTONES:
        if milestone["due_month"] >= current_month:
            suggestion = milestone.copy()
            # Add university-specific suggestions
            if target_universities and milestone["category"] == "application":
                unis_str = ", ".join(target_universities[:3])
                suggestion["description"] += f"\n🏫 Trường mục tiêu của bạn: {unis_str}"
            suggestions.append(suggestion)

    return suggestions

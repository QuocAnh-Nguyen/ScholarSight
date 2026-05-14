"""Probability engine routes - percentile matching and competitive map."""

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


class ProbabilityRequest(BaseModel):
    score: float
    university: str
    major: str
    admission_method: str = "regular"  # regular, priority, aptitude_test


class TierResult(BaseModel):
    tier: str  # safety, target, reach
    emoji: str
    label: str
    percentile_rank: float


class CompetitiveMapData(BaseModel):
    candidate_score: float
    cutoff_score: float
    score_distribution: dict  # percentile buckets
    tier_boundaries: dict
    historical_years: list[dict]


class ProbabilityResponse(BaseModel):
    tier: TierResult
    competitive_map: CompetitiveMapData
    disclaimer: str = "⚠️ Dữ liệu dựa trên thống kê lịch sử. Kết quả thực tế có thể khác biệt."


@router.post("/assess", response_model=ProbabilityResponse)
async def assess_probability(
    body: ProbabilityRequest,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ProbabilityResponse:
    """Assess admission probability using percentile matching.

    Calculates the candidate's percentile rank against historical score distributions,
    applies 3-year variance smoothing, and classifies into Safety/Target/Reach tiers.
    """
    from app.services.probability.percentile_matcher import calculate_percentile
    from app.services.probability.competitive_map import generate_competitive_map

    # Fetch historical data
    result = await db.execute(
        text(
            "SELECT academic_year, cutoff_score, score_distribution, quota "
            "FROM historical_scores "
            "WHERE university_name = :uni AND major = :major AND admission_method = :method "
            "ORDER BY academic_year DESC LIMIT 3"
        ),
        {"uni": body.university, "major": body.major, "method": body.admission_method},
    )
    rows = result.fetchall()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No historical data found for {body.university} - {body.major}",
        )

    # Calculate percentile with 3-year variance smoothing
    historical_data = [
        {
            "year": row[0],
            "cutoff": row[1],
            "distribution": row[2],
            "quota": row[3],
        }
        for row in rows
    ]

    percentile_rank = calculate_percentile(body.score, historical_data)

    # Classify tier
    if percentile_rank >= 90:
        tier = TierResult(tier="safety", emoji="🟢", label="An toàn", percentile_rank=percentile_rank)
    elif percentile_rank >= 50:
        tier = TierResult(tier="target", emoji="🟡", label="Mục tiêu", percentile_rank=percentile_rank)
    else:
        tier = TierResult(tier="reach", emoji="🔴", label="Thách thức", percentile_rank=percentile_rank)

    # Generate competitive map data
    competitive_map = generate_competitive_map(body.score, historical_data)

    # Store assessment
    if user_id:
        try:
            import json
            await db.execute(
                text(
                    "INSERT INTO probability_assessments "
                    "(user_id, university_name, major, candidate_score, tier, percentile_rank, competitive_map_data) "
                    "VALUES (:uid, :uni, :major, :score, :tier, :prank, :cmap)"
                ),
                {
                    "uid": user_id,
                    "uni": body.university,
                    "major": body.major,
                    "score": body.score,
                    "tier": tier.tier,
                    "prank": percentile_rank,
                    "cmap": json.dumps(competitive_map.model_dump()),
                },
            )
        except Exception as e:
            logger.warning(f"Failed to store probability assessment: {e}")

    return ProbabilityResponse(tier=tier, competitive_map=competitive_map)


@router.get("/history")
async def get_assessment_history(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get probability assessment history for the current user."""
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    result = await db.execute(
        text(
            "SELECT id, university_name, major, candidate_score, tier, percentile_rank, created_at "
            "FROM probability_assessments WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50"
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return [
        {
            "id": str(r[0]),
            "university": r[1],
            "major": r[2],
            "score": r[3],
            "tier": r[4],
            "percentile_rank": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
        }
        for r in rows
    ]

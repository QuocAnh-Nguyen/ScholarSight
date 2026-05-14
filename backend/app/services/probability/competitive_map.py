"""Competitive map data generation for probability visualization."""

import logging
from typing import List

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class CompetitiveMapData(BaseModel):
    """Data structure for competitive map visualization."""
    candidate_score: float
    cutoff_score: float
    score_distribution: dict
    tier_boundaries: dict
    historical_years: list[dict]


def generate_competitive_map(
    candidate_score: float,
    historical_data: list[dict],
) -> CompetitiveMapData:
    """Generate competitive map visualization data.

    Args:
        candidate_score: The candidate's exam score.
        historical_data: Historical score distribution data.

    Returns:
        CompetitiveMapData with all chart data points.
    """
    # Use most recent year as primary
    latest = historical_data[0] if historical_data else {}
    cutoff = latest.get("cutoff", 0)
    distribution = latest.get("distribution", {})

    # Calculate tier boundaries from distribution
    # Safety: >= 90th percentile score
    # Target: 50-89th percentile score
    # Reach: < 50th percentile score
    safety_score = float(distribution.get("90", cutoff * 1.1)) if distribution else cutoff * 1.1
    target_score = float(distribution.get("50", cutoff)) if distribution else cutoff
    reach_score = float(distribution.get("20", cutoff * 0.8)) if distribution else cutoff * 0.8

    tier_boundaries = {
        "safety": {"min_score": safety_score, "label": "🟢 An toàn", "percentile": 90},
        "target": {"min_score": target_score, "label": "🟡 Mục tiêu", "percentile": 50},
        "reach": {"min_score": reach_score, "label": "🔴 Thách thức", "percentile": 0},
    }

    # Build historical year data for chart
    historical_years = []
    for year_data in historical_data:
        historical_years.append({
            "year": year_data.get("year"),
            "cutoff_score": year_data.get("cutoff"),
            "quota": year_data.get("quota"),
            "distribution": year_data.get("distribution", {}),
        })

    return CompetitiveMapData(
        candidate_score=candidate_score,
        cutoff_score=cutoff,
        score_distribution=distribution,
        tier_boundaries=tier_boundaries,
        historical_years=historical_years,
    )

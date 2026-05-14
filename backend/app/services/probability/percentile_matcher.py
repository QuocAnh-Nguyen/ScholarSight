"""Percentile matching algorithm for admission probability."""

import logging
from typing import List

logger = logging.getLogger(__name__)


def calculate_percentile(candidate_score: float, historical_data: list[dict]) -> float:
    """Calculate percentile rank using historical score distributions with 3-year variance smoothing.

    Args:
        candidate_score: The candidate's exam score.
        historical_data: List of dicts with keys: year, cutoff, distribution, quota.
            distribution is a JSONB dict of percentile buckets, e.g.:
            {"10": 15.0, "20": 17.5, "30": 19.0, ...}

    Returns:
        Percentile rank (0-100).
    """
    if not historical_data:
        return 0.0

    percentile_ranks = []

    for year_data in historical_data:
        distribution = year_data.get("distribution", {})
        cutoff = year_data.get("cutoff", 0)

        if not distribution:
            # Fallback: simple cutoff comparison
            if cutoff > 0:
                ratio = candidate_score / cutoff
                rank = min(ratio * 50, 100.0)  # Scale relative to cutoff
                percentile_ranks.append(rank)
            continue

        # Find the candidate's position in the distribution
        percentiles = sorted(distribution.items(), key=lambda x: int(x[0]))
        rank = 0.0

        for pct_str, score_val in percentiles:
            pct = int(pct_str)
            if candidate_score >= float(score_val):
                rank = float(pct)
            else:
                # Interpolate between this and previous percentile
                prev_pct = rank
                prev_score = 0.0
                for p_str, p_val in percentiles:
                    if int(p_str) == int(prev_pct):
                        prev_score = float(p_val)
                        break

                if float(score_val) != prev_score:
                    fraction = (candidate_score - prev_score) / (float(score_val) - prev_score)
                    rank = prev_pct + fraction * (pct - prev_pct)
                break
        else:
            # Candidate scored above all recorded percentiles
            rank = 99.0

        percentile_ranks.append(rank)

    if not percentile_ranks:
        return 0.0

    # 3-year variance smoothing: weighted average (most recent year weighted most)
    if len(percentile_ranks) == 1:
        return round(percentile_ranks[0], 1)

    weights = list(range(len(percentile_ranks), 0, -1))  # Most recent = highest weight
    total_weight = sum(weights)
    smoothed = sum(r * w for r, w in zip(percentile_ranks, weights)) / total_weight

    return round(min(max(smoothed, 0.0), 100.0), 1)

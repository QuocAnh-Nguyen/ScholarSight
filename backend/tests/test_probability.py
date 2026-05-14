"""Tests for the probability engine percentile matching."""

import pytest

from app.services.probability.percentile_matcher import calculate_percentile


def test_percentile_high_score():
    """Candidate with score well above cutoff should get high percentile."""
    historical = [
        {
            "year": 2023,
            "cutoff": 27.0,
            "quota": 300,
            "distribution": {
                "10": 22.0, "30": 24.5, "50": 26.0,
                "70": 27.3, "90": 28.5, "95": 29.0,
            },
        },
    ]
    result = calculate_percentile(29.0, historical)
    assert result >= 90.0


def test_percentile_at_cutoff():
    """Candidate with score at cutoff should get ~50th percentile."""
    historical = [
        {
            "year": 2023,
            "cutoff": 26.0,
            "quota": 500,
            "distribution": {
                "10": 22.5, "30": 24.5, "50": 26.0,
                "70": 27.0, "90": 28.0,
            },
        },
    ]
    result = calculate_percentile(26.0, historical)
    assert 40.0 <= result <= 60.0


def test_percentile_low_score():
    """Candidate with low score should get low percentile."""
    historical = [
        {
            "year": 2023,
            "cutoff": 27.5,
            "quota": 300,
            "distribution": {
                "10": 22.0, "30": 24.5, "50": 26.0,
                "70": 27.3, "90": 28.5,
            },
        },
    ]
    result = calculate_percentile(22.0, historical)
    assert result < 20.0


def test_percentile_empty_data():
    """Empty historical data should return 0."""
    assert calculate_percentile(25.0, []) == 0.0


def test_percentile_multi_year_variance():
    """Multi-year data should return smoothed result."""
    historical = [
        {"year": 2023, "cutoff": 27.5, "distribution": {"50": 27.5, "90": 29.0}},
        {"year": 2022, "cutoff": 27.0, "distribution": {"50": 27.0, "90": 28.5}},
        {"year": 2021, "cutoff": 26.5, "distribution": {"50": 26.5, "90": 28.0}},
    ]
    result = calculate_percentile(28.0, historical)
    assert 60.0 <= result <= 95.0
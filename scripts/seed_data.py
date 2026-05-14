#!/usr/bin/env python3
"""Seed the database with default data for development.

Usage:
    python scripts/seed_data.py

Environment variables (same as backend .env):
    DATABASE_URL - PostgreSQL connection string
"""

import asyncio
import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_data")


async def seed_historical_scores():
    """Seed historical score data for Vietnamese universities."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://scholarsight:scholarsight_dev@localhost:5432/scholarsight",
    )
    engine = create_async_engine(db_url)
    async_session = async_sessionmaker(engine)

    universities = [
        {
            "university_name": "Trường Đại học Bách khoa Hà Nội",
            "majors": [
                {
                    "major": "Khoa học Máy tính",
                    "method": "regular",
                    "quota": 300,
                    "cutoff_2023": 27.5,
                    "cutoff_2022": 27.0,
                    "cutoff_2021": 26.5,
                    "distribution": {
                        "10": 22.0, "20": 23.5, "30": 24.5, "40": 25.2,
                        "50": 26.0, "60": 26.8, "70": 27.3, "80": 27.8,
                        "90": 28.5, "95": 29.0, "99": 29.5,
                    },
                },
                {
                    "major": "Kỹ thuật Điện",
                    "method": "regular",
                    "quota": 250,
                    "cutoff_2023": 25.0,
                    "cutoff_2022": 24.5,
                    "cutoff_2021": 24.0,
                    "distribution": {
                        "10": 20.0, "20": 21.5, "30": 22.5, "40": 23.2,
                        "50": 24.0, "60": 24.8, "70": 25.3, "80": 25.8,
                        "90": 26.5, "95": 27.0, "99": 27.5,
                    },
                },
            ],
        },
        {
            "university_name": "Trường Đại học Kinh tế Quốc dân",
            "majors": [
                {
                    "major": "Kinh tế",
                    "method": "regular",
                    "quota": 500,
                    "cutoff_2023": 27.0,
                    "cutoff_2022": 26.5,
                    "cutoff_2021": 26.0,
                    "distribution": {
                        "10": 22.5, "20": 23.8, "30": 24.5, "40": 25.2,
                        "50": 26.0, "60": 26.5, "70": 27.0, "80": 27.5,
                        "90": 28.0, "95": 28.5, "99": 29.0,
                    },
                },
            ],
        },
        {
            "university_name": "Trường Đại học Ngoại thương",
            "majors": [
                {
                    "major": "Kinh tế Đối ngoại",
                    "method": "regular",
                    "quota": 200,
                    "cutoff_2023": 28.5,
                    "cutoff_2022": 28.0,
                    "cutoff_2021": 27.5,
                    "distribution": {
                        "10": 24.0, "20": 25.0, "30": 25.8, "40": 26.5,
                        "50": 27.0, "60": 27.5, "70": 28.0, "80": 28.5,
                        "90": 29.0, "95": 29.3, "99": 29.5,
                    },
                },
            ],
        },
    ]

    async with async_session() as db:
        for uni in universities:
            for major_data in uni["majors"]:
                for year in [2021, 2022, 2023]:
                    cutoff_key = f"cutoff_{year}"
                    cutoff = major_data.get(cutoff_key, 0)

                    await db.execute(
                        text(
                            "INSERT INTO historical_scores "
                            "(university_name, major, academic_year, admission_method, "
                            "quota, cutoff_score, score_distribution) "
                            "VALUES (:uni, :major, :year, :method, :quota, :cutoff, :dist) "
                            "ON CONFLICT DO NOTHING"
                        ),
                        {
                            "uni": uni["university_name"],
                            "major": major_data["major"],
                            "year": year,
                            "method": major_data["method"],
                            "quota": major_data["quota"],
                            "cutoff": cutoff,
                            "dist": json.dumps(major_data["distribution"]),
                        },
                    )

        await db.commit()
        logger.info(f"Seeded {len(universities)} universities with historical score data")


async def main():
    logger.info("Starting database seed...")
    try:
        await seed_historical_scores()
        logger.info("Seed completed successfully!")
    except Exception as e:
        logger.error(f"Seed failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
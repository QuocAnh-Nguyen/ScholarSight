"""BGE-M3 embedding service client."""

import logging
from typing import List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def get_query_embedding(text: str) -> List[float]:
    """Generate embedding for a query string using BGE-M3 via TEI.

    Args:
        text: The text to embed.

    Returns:
        1024-dimensional embedding vector.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{settings.EMBEDDING_SERVICE_URL}/embed",
            json={"inputs": text},
        )
        response.raise_for_status()
        data = response.json()

        # TEI returns a list of embeddings; we want the first one
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], list):
                return data[0]
            return data

        raise ValueError(f"Unexpected embedding response format: {type(data)}")


async def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a batch of texts.

    Args:
        texts: List of texts to embed.

    Returns:
        List of 1024-dimensional embedding vectors.
    """
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.EMBEDDING_SERVICE_URL}/embed",
            json={"inputs": texts},
        )
        response.raise_for_status()
        data = response.json()

        if isinstance(data, list):
            return data

        raise ValueError(f"Unexpected batch embedding response format: {type(data)}")

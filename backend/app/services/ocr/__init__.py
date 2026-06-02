"""OCR service with three-tier fallback chain.

FIXES APPLIED (audit report):
  - #3A  Hallucinated DeepSeek OCR: DeepSeekOCRService now uses the Chat
          Completions API (vision-capable model) instead of the non-existent
          /v1/ocr endpoint.  API keys are wired from settings so the chain
          can be configured via environment variables.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.core.config import settings
from app.services.ocr.base import BaseOCRService, OCRResult, OCRExtractionError
from app.services.ocr.deepseek_ocr import DeepSeekOCRService
from app.services.ocr.mistral_ocr import MistralOCRService
from app.services.ocr.pageindex import PageIndexOCRService

logger = logging.getLogger(__name__)


class OCRFallbackChain:
    """Three-tier OCR fallback: Mistral → DeepSeek → PageIndex.

    Mistral is tried first because it has a dedicated OCR endpoint.
    DeepSeek is the secondary fallback (vision-LLM extraction).
    PageIndex is the tertiary fallback.
    """

    def __init__(self) -> None:
        self.services: list[BaseOCRService] = [
            MistralOCRService(api_key=getattr(settings, "MISTRAL_API_KEY", "")),
            DeepSeekOCRService(api_key=settings.OPENAI_API_KEY),
            PageIndexOCRService(api_key=getattr(settings, "PAGEINDEX_API_KEY", "")),
        ]

    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Try each OCR service in order until one succeeds."""
        last_error: Optional[Exception] = None

        for service in self.services:
            try:
                logger.info("Attempting OCR with %s...", service.name)
                result = await service.extract(pdf_bytes, filename)
                logger.info(
                    "OCR succeeded with %s: %d components extracted",
                    service.name, len(result.components),
                )
                return result
            except OCRExtractionError as exc:
                logger.warning("OCR with %s failed: %s", service.name, exc)
                last_error = exc
                continue

        raise OCRExtractionError(
            f"All OCR services failed. Last error: {last_error}"
        )


# Singleton instance
ocr_chain = OCRFallbackChain()

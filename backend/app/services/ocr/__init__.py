"""OCR service with three-tier fallback chain."""

import logging
from typing import Optional

from app.services.ocr.base import BaseOCRService, OCRResult, OCRExtractionError
from app.services.ocr.deepseek_ocr import DeepSeekOCRService
from app.services.ocr.mistral_ocr import MistralOCRService
from app.services.ocr.pageindex import PageIndexOCRService

logger = logging.getLogger(__name__)


class OCRFallbackChain:
    """Three-tier OCR fallback: DeepSeek → Mistral → PageIndex."""

    def __init__(self):
        self.services: list[BaseOCRService] = [
            DeepSeekOCRService(),
            MistralOCRService(),
            PageIndexOCRService(),
        ]

    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Try each OCR service in order until one succeeds."""
        last_error: Optional[Exception] = None

        for service in self.services:
            try:
                logger.info(f"Attempting OCR with {service.name}...")
                result = await service.extract(pdf_bytes, filename)
                logger.info(f"OCR succeeded with {service.name}: {len(result.components)} components extracted")
                return result
            except OCRExtractionError as e:
                logger.warning(f"OCR with {service.name} failed: {e}")
                last_error = e
                continue

        raise OCRExtractionError(f"All OCR services failed. Last error: {last_error}")


# Singleton instance
ocr_chain = OCRFallbackChain()

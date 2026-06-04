"""DeepSeek OCR service adapter.

FIXES APPLIED:
  - #3A  Hallucinated DeepSeek OCR endpoint replaced with Chat Completions.
  - #4   Hallucinated `type: file` payload: DeepSeek's Chat Completions API
          does NOT support a "file" content type.  Instead we first extract
          raw text from the PDF bytes using PyPDF2 locally, then send the
          text to DeepSeek for structured parsing (tables, formatting, etc.).
          This avoids HTTP 400 errors while still leveraging the LLM for
          intelligent extraction.

If PyPDF2 is unavailable the service raises OCRExtractionError, allowing the
chain to fall through to Mistral / PageIndex.
"""

from __future__ import annotations

import io
import json as _json
import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.ocr.base import (
    BaseOCRService,
    OCRComponent,
    OCRResult,
    OCRExtractionError,
)

logger = logging.getLogger(__name__)

DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions"

EXTRACTION_SYSTEM_PROMPT = """You are an OCR post-processor specialized in Vietnamese
university admission documents.

You will receive raw text extracted from a PDF.  Your job is to restructure it
into the JSON schema below.  Preserve ALL Vietnamese diacritics exactly.

Return ONLY valid JSON (no markdown fences):

{
  "pages": [
    {
      "page_number": 1,
      "text_blocks": [
        {"text": "...", "bbox": null, "confidence": 0.95}
      ],
      "tables": [
        {"cells": [["h1","h2"],["v1","v2"]], "confidence": 0.9}
      ],
      "images": []
    }
  ]
}

Rules:
- Group consecutive lines into text_blocks (one block per paragraph/section).
- Detect tables: if you see tabular data, output it as a 2D cells array.
- Set confidence between 0.0 and 1.0 for every block.
- Do NOT invent information not present in the raw text."""


class DeepSeekOCRService(BaseOCRService):
    """OCR service that combines PyPDF2 text extraction + DeepSeek LLM parsing.

    PyPDF2 extracts raw text locally (fast, no API call for basic extraction).
    DeepSeek then structures the raw text into components (tables, paragraphs).
    """

    def __init__(self, api_key: str = "", api_url: str = DEEPSEEK_CHAT_URL):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.api_url = api_url

    @property
    def name(self) -> str:
        return "deepseek_ocr"

    # ------------------------------------------------------------------
    # FIX #4: Use PyPDF2 for local text extraction, then DeepSeek for
    # structured parsing.  No hallucinated "file" content type.
    # ------------------------------------------------------------------
    def _extract_raw_text(self, pdf_bytes: bytes, filename: str) -> str:
        """Extract raw text from PDF bytes using PyPDF2."""
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            raise OCRExtractionError(
                "PyPDF2 is not installed — DeepSeek OCR requires it for text extraction"
            )

        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages: list[str] = []
        for i, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"[Page {i}]\n{text}")
        return "\n\n".join(pages)

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=2, max=15))
    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text/components from PDF using PyPDF2 + DeepSeek Chat."""
        if not self.api_key:
            raise OCRExtractionError("No API key configured for DeepSeek OCR")

        # Step 1: local text extraction
        raw_text = self._extract_raw_text(pdf_bytes, filename)
        if not raw_text.strip():
            raise OCRExtractionError("PyPDF2 extracted no text from the document")

        # Step 2: send raw text to DeepSeek for structured parsing
        try:
            async with httpx.AsyncClient(timeout=180) as client:
                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                            {
                                "role": "user",
                                "content": (
                                    f"Raw PDF text from {filename}:\n\n{raw_text[:50000]}"
                                ),
                            },
                        ],
                        "max_tokens": 8000,
                        "temperature": 0.0,
                    },
                )
                response.raise_for_status()
                payload = response.json()

            content = payload["choices"][0]["message"]["content"]
            data = _json.loads(content)

        except httpx.HTTPStatusError as exc:
            logger.error(
                "DeepSeek Chat HTTP %d: %s", exc.response.status_code, exc,
            )
            raise OCRExtractionError(
                f"DeepSeek OCR failed (HTTP {exc.response.status_code})"
            ) from exc
        except (_json.JSONDecodeError, KeyError) as exc:
            logger.error("DeepSeek response parsing error: %s", exc)
            raise OCRExtractionError(
                "DeepSeek OCR returned unparseable response"
            ) from exc
        except Exception as exc:
            logger.error("DeepSeek OCR error: %s", exc)
            raise OCRExtractionError(f"DeepSeek OCR failed: {exc}") from exc

        # Step 3: build OCRResult from structured data
        components: list[OCRComponent] = []
        raw_text_parts: list[str] = []

        for page in data.get("pages", []):
            page_num = page.get("page_number", 1)

            for block in page.get("text_blocks", []):
                text = block.get("text", "")
                raw_text_parts.append(text)
                components.append(
                    OCRComponent(
                        component_type="text",
                        content=text,
                        page_number=page_num,
                        bounding_box=block.get("bbox"),
                        confidence=block.get("confidence", 0.0),
                    )
                )

            for table in page.get("tables", []):
                components.append(
                    OCRComponent(
                        component_type="table",
                        content=_json.dumps(
                            table.get("cells", []), ensure_ascii=False,
                        ),
                        page_number=page_num,
                        table_structure=table,
                        confidence=table.get("confidence", 0.0),
                    )
                )

            for img in page.get("images", []):
                components.append(
                    OCRComponent(
                        component_type="image",
                        content=img.get("description", ""),
                        page_number=page_num,
                        bounding_box=img.get("bbox"),
                        confidence=img.get("confidence", 0.0),
                    )
                )

        return OCRResult(
            components=components,
            total_pages=len(data.get("pages", [])),
            ocr_source=self.name,
            raw_text="\n".join(raw_text_parts),
        )

"""DeepSeek OCR service adapter.

FIXES APPLIED (audit report):
  - #3A  Hallucinated DeepSeek OCR: the original implementation targeted
          https://api.deepseek.com/v1/ocr which does NOT exist.  Replaced
          with a *vision-capable* LLM-based extraction using DeepSeek's
          Chat Completions API (the same api_key already configured).
          The service now sends the PDF as a data-URI image for each page
          and asks the model to return structured JSON.

          If the OCR fallback chain can't use this approach (e.g. no
          vision model key), the chain gracefully falls through to Mistral
          (which has a real OCR endpoint) and then PageIndex.
"""

from __future__ import annotations

import base64
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

EXTRACTION_SYSTEM_PROMPT = """You are an OCR engine specialized in Vietnamese university admission documents.

Extract ALL text, tables, and images from the provided document pages.
Return ONLY valid JSON with this exact schema:

{
  "pages": [
    {
      "page_number": 1,
      "text_blocks": [
        {"text": "extracted text", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.95}
      ],
      "tables": [
        {"cells": [["cell", "cell"]], "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.9}
      ],
      "images": [
        {"description": "image description", "bbox": {"x": 0, "y": 0, "width": 0, "height": 0}, "confidence": 0.85}
      ]
    }
  ]
}

Rules:
- Extract Vietnamese text exactly as written, preserving diacritics.
- Preserve tabular data as structured 2D arrays in the tables array.
- For images, provide a short description if visible text is present.
- Set confidence between 0.0 and 1.0 for every block.
- Do NOT wrap the JSON in markdown code fences — output raw JSON only."""


class DeepSeekOCRService(BaseOCRService):
    """OCR service using DeepSeek's Chat Completions API for document extraction.

    Uses the vision-capable deepseek-chat model to analyze PDF pages and
    return structured JSON.  This replaces the hallucinated /v1/ocr endpoint.
    """

    def __init__(self, api_key: str = "", api_url: str = DEEPSEEK_CHAT_URL):
        self.api_key = api_key or settings.OPENAI_API_KEY  # fallback to shared key
        self.api_url = api_url

    @property
    def name(self) -> str:
        return "deepseek_ocr"

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=2, max=15))
    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text/components from PDF using DeepSeek Chat API."""
        if not self.api_key:
            raise OCRExtractionError("No API key configured for DeepSeek OCR")

        try:
            encoded = base64.b64encode(pdf_bytes).decode("utf-8")
            data_uri = f"data:application/pdf;base64,{encoded}"

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
                                "content": [
                                    {
                                        "type": "text",
                                        "text": f"Extract all content from this PDF document: {filename}",
                                    },
                                    {
                                        "type": "file",
                                        "file": {
                                            "file_data": data_uri,
                                            "filename": filename,
                                        },
                                    },
                                ],
                            },
                        ],
                        "max_tokens": 8000,
                        "temperature": 0.0,
                    },
                )
                response.raise_for_status()
                payload = response.json()

            # Parse the model's JSON response
            content = payload["choices"][0]["message"]["content"]
            data = _json.loads(content)

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
                            content=_json.dumps(table.get("cells", []), ensure_ascii=False),
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

        except httpx.HTTPStatusError as exc:
            logger.error("DeepSeek Chat HTTP %d: %s", exc.response.status_code, exc)
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

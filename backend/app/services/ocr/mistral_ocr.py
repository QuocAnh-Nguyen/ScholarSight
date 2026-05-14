"""Mistral AI OCR service adapter."""

import logging

import httpx

from app.services.ocr.base import BaseOCRService, OCRComponent, OCRResult, OCRExtractionError

logger = logging.getLogger(__name__)


class MistralOCRService(BaseOCRService):
    """OCR service using Mistral AI's API."""

    def __init__(self, api_key: str = "", api_url: str = "https://api.mistral.ai/v1/ocr"):
        self.api_key = api_key
        self.api_url = api_url

    @property
    def name(self) -> str:
        return "mistral_ocr"

    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text/components from PDF using Mistral OCR API."""
        try:
            import base64

            async with httpx.AsyncClient(timeout=120) as client:
                encoded = base64.b64encode(pdf_bytes).decode()

                response = await client.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "mistral-ocr-latest",
                        "document": {
                            "type": "document_url",
                            "data": f"data:application/pdf;base64,{encoded}",
                        },
                    },
                )
                response.raise_for_status()
                data = response.json()

            components = []
            raw_text_parts = []

            for page in data.get("pages", []):
                page_num = page.get("index", 0) + 1
                markdown = page.get("markdown", "")
                raw_text_parts.append(markdown)

                # Parse markdown content into components
                components.append(
                    OCRComponent(
                        component_type="text",
                        content=markdown,
                        page_number=page_num,
                        confidence=0.9,
                    )
                )

                # Extract images referenced in the page
                for img in page.get("images", []):
                    img_data = img.get("data")
                    components.append(
                        OCRComponent(
                            component_type="image",
                            content=img.get("id", ""),
                            page_number=page_num,
                            image_bytes=base64.b64decode(img_data) if img_data else None,
                            confidence=0.9,
                        )
                    )

            return OCRResult(
                components=components,
                total_pages=len(data.get("pages", [])),
                ocr_source=self.name,
                raw_text="\n".join(raw_text_parts),
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Mistral OCR HTTP error: {e.response.status_code}")
            raise OCRExtractionError(f"Mistral OCR failed: {e}") from e
        except Exception as e:
            logger.error(f"Mistral OCR error: {e}")
            raise OCRExtractionError(f"Mistral OCR failed: {e}") from e

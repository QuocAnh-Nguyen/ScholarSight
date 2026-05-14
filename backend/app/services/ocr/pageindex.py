"""PageIndex OCR service adapter (tertiary fallback)."""

import logging

import httpx

from app.services.ocr.base import BaseOCRService, OCRComponent, OCRResult, OCRExtractionError

logger = logging.getLogger(__name__)


class PageIndexOCRService(BaseOCRService):
    """OCR service using PageIndex API as tertiary fallback."""

    def __init__(self, api_key: str = "", api_url: str = "https://api.pageindex.ai/v1/extract"):
        self.api_key = api_key
        self.api_url = api_url

    @property
    def name(self) -> str:
        return "pageindex"

    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text/components from PDF using PageIndex API."""
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    self.api_url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"file": (filename, pdf_bytes, "application/pdf")},
                    data={"extract_tables": "true", "extract_images": "true"},
                )
                response.raise_for_status()
                data = response.json()

            components = []
            raw_text_parts = []

            for page in data.get("pages", []):
                page_num = page.get("page_number", 1)

                # Text content
                text_content = page.get("text", "")
                if text_content:
                    raw_text_parts.append(text_content)
                    components.append(
                        OCRComponent(
                            component_type="text",
                            content=text_content,
                            page_number=page_num,
                            confidence=page.get("confidence", 0.0),
                        )
                    )

                # Tables
                for table in page.get("tables", []):
                    components.append(
                        OCRComponent(
                            component_type="table",
                            content=str(table),
                            page_number=page_num,
                            table_structure=table,
                            confidence=0.8,
                        )
                    )

            return OCRResult(
                components=components,
                total_pages=len(data.get("pages", [])),
                ocr_source=self.name,
                raw_text="\n".join(raw_text_parts),
            )

        except Exception as e:
            logger.error(f"PageIndex OCR error: {e}")
            raise OCRExtractionError(f"PageIndex OCR failed: {e}") from e

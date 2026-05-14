"""DeepSeek OCR service adapter."""

import logging

import httpx

from app.services.ocr.base import BaseOCRService, OCRComponent, OCRResult, OCRExtractionError

logger = logging.getLogger(__name__)


class DeepSeekOCRService(BaseOCRService):
    """OCR service using DeepSeek's API."""

    def __init__(self, api_key: str = "", api_url: str = "https://api.deepseek.com/v1/ocr"):
        self.api_key = api_key
        self.api_url = api_url

    @property
    def name(self) -> str:
        return "deepseek_ocr"

    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text/components from PDF using DeepSeek OCR API."""
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                import base64
                encoded = base64.b64encode(pdf_bytes).decode()

                response = await client.post(
                    self.api_url,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "file": encoded,
                        "filename": filename,
                        "extract_tables": True,
                        "extract_images": True,
                    },
                )
                response.raise_for_status()
                data = response.json()

            components = []
            raw_text_parts = []

            for page in data.get("pages", []):
                page_num = page.get("page_number", 1)

                # Text blocks
                for block in page.get("text_blocks", []):
                    text_content = block.get("text", "")
                    raw_text_parts.append(text_content)
                    components.append(
                        OCRComponent(
                            component_type="text",
                            content=text_content,
                            page_number=page_num,
                            bounding_box=block.get("bbox"),
                            confidence=block.get("confidence", 0.0),
                        )
                    )

                # Tables
                for table in page.get("tables", []):
                    components.append(
                        OCRComponent(
                            component_type="table",
                            content=str(table.get("cells", [])),
                            page_number=page_num,
                            table_structure=table,
                            confidence=table.get("confidence", 0.0),
                        )
                    )

                # Images
                for img in page.get("images", []):
                    components.append(
                        OCRComponent(
                            component_type="image",
                            content=img.get("description", ""),
                            page_number=page_num,
                            bounding_box=img.get("bbox"),
                            image_bytes=base64.b64decode(img["data"]) if img.get("data") else None,
                            confidence=img.get("confidence", 0.0),
                        )
                    )

            return OCRResult(
                components=components,
                total_pages=len(data.get("pages", [])),
                ocr_source=self.name,
                raw_text="\n".join(raw_text_parts),
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"DeepSeek OCR HTTP error: {e.response.status_code}")
            raise OCRExtractionError(f"DeepSeek OCR failed: {e}") from e
        except Exception as e:
            logger.error(f"DeepSeek OCR error: {e}")
            raise OCRExtractionError(f"DeepSeek OCR failed: {e}") from e

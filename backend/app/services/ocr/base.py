"""Abstract base class for OCR services."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class OCRComponent:
    """A single component extracted by OCR."""
    component_type: str  # 'image', 'table', 'text'
    content: str  # Raw text or structured content
    page_number: int
    bounding_box: Optional[dict] = None  # {x, y, width, height}
    image_bytes: Optional[bytes] = None  # For image components
    table_structure: Optional[dict] = None  # For table components
    confidence: float = 0.0


@dataclass
class OCRResult:
    """Result from OCR extraction of a single page or document."""
    components: list[OCRComponent]
    total_pages: int
    ocr_source: str
    raw_text: str = ""


class BaseOCRService(ABC):
    """Abstract OCR service interface."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of this OCR service (for logging/tracking)."""
        ...

    @abstractmethod
    async def extract(self, pdf_bytes: bytes, filename: str) -> OCRResult:
        """Extract text and components from a PDF.

        Args:
            pdf_bytes: Raw PDF file content.
            filename: Original filename for context.

        Returns:
            OCRResult with extracted components.

        Raises:
            OCRExtractionError: If extraction fails.
        """
        ...


class OCRExtractionError(Exception):
    """Raised when OCR extraction fails."""
    pass

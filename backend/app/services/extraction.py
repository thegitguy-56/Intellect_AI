import io

import pymupdf as fitz
import pytesseract
from docx import Document
from pdf2image import convert_from_bytes

# Below this many characters per page on average, assume the PDF has no real
# text layer (i.e. it's a scan) and fall back to OCR.
MIN_CHARS_PER_PAGE = 20


def extract_text(file_bytes: bytes, filename: str) -> str:
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return _extract_pdf(file_bytes)
    if lower.endswith(".docx"):
        return _extract_docx(file_bytes)
    if lower.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type: {filename}")


def _extract_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        pages = [page.get_text() for page in doc]
        text = "\n".join(pages)
        avg_chars_per_page = len(text) / max(len(pages), 1)
        if avg_chars_per_page < MIN_CHARS_PER_PAGE:
            return _ocr_pdf(file_bytes)
        return text
    finally:
        doc.close()


def _ocr_pdf(file_bytes: bytes) -> str:
    # Free-tier tradeoff: OCR on Render's free CPU tier is slow (seconds per
    # page) and has no GPU — acceptable for occasional scanned uploads in a
    # course project, not for high-volume production use.
    #
    # Render's free plan caps memory at 512MB. convert_from_bytes() renders
    # every page to an in-memory image up front — for a multi-page patent
    # that's tens of MB per page held simultaneously, on top of spaCy/
    # scikit-learn/pymupdf already loaded, and OOM-kills the instance mid
    # request. Converting and OCR'ing one page at a time keeps peak memory
    # to roughly a single page's image instead of the whole document.
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page_count = doc.page_count
    doc.close()

    pages_text = []
    for page_number in range(1, page_count + 1):
        images = convert_from_bytes(file_bytes, first_page=page_number, last_page=page_number)
        for image in images:
            pages_text.append(pytesseract.image_to_string(image))
    return "\n".join(pages_text)


def _extract_docx(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(paragraph.text for paragraph in doc.paragraphs)

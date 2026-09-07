"""
Tests for backend/app/services/ner.py.

Covers:
- Entity extraction on synthetic patent-style text
- Only the four mapped types (person/org/date/monetary) are returned
- Span offsets are within the input text bounds
- No crash on empty or very short text
- Truncation guard (text longer than spaCy max_length still works)
- Output schema consistency
- NER on real patent text extracted from the PDFs in docs/
"""

from pathlib import Path

import pytest

from app.services.ner import extract_entities, get_nlp
from tests.test_extraction import requires_poppler

DOCS = Path(__file__).resolve().parents[2] / "docs"
PDF_US10156900 = DOCS / "US10156900.pdf"
PDF_US11941918 = DOCS / "US11941918.pdf"

VALID_TYPES = {"person", "org", "date", "monetary"}

# A short but realistic patent-style passage with known entities
SAMPLE_TEXT = (
    "Dr. Jane Smith and IBM filed US Patent 10,156,900 on January 15, 2018. "
    "The filing fee was $3,200. Microsoft Corporation later acquired the rights."
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pdf_text(path: Path) -> str:
    if not path.exists():
        pytest.skip(f"PDF not found: {path}")
    from app.services.extraction import extract_text
    return extract_text(path.read_bytes(), path.name)


# ---------------------------------------------------------------------------
# Basic extraction
# ---------------------------------------------------------------------------

class TestExtractEntities:
    def test_returns_list(self):
        result = extract_entities(SAMPLE_TEXT)
        assert isinstance(result, list)

    def test_only_valid_types_returned(self):
        result = extract_entities(SAMPLE_TEXT)
        for ent in result:
            assert ent["entity_type"] in VALID_TYPES, (
                f"Unexpected entity type: {ent['entity_type']}"
            )

    def test_entity_dict_has_required_keys(self):
        result = extract_entities(SAMPLE_TEXT)
        required = {"entity_type", "entity_value", "span_start", "span_end"}
        for ent in result:
            assert required <= ent.keys(), f"Missing keys in entity: {ent}"

    def test_span_offsets_within_bounds(self):
        result = extract_entities(SAMPLE_TEXT)
        for ent in result:
            assert 0 <= ent["span_start"] < ent["span_end"] <= len(SAMPLE_TEXT), (
                f"Span out of range for entity: {ent}"
            )

    def test_span_text_matches_entity_value(self):
        """The slice [span_start:span_end] should equal entity_value."""
        result = extract_entities(SAMPLE_TEXT)
        for ent in result:
            sliced = SAMPLE_TEXT[ent["span_start"]: ent["span_end"]]
            assert sliced == ent["entity_value"], (
                f"Span mismatch: '{sliced}' != '{ent['entity_value']}'"
            )

    def test_detects_at_least_one_entity(self):
        """Sample text has clear org/person/date/monetary — at least one expected."""
        result = extract_entities(SAMPLE_TEXT)
        assert len(result) >= 1, "Expected at least one entity in sample text"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestNerEdgeCases:
    def test_empty_string_returns_empty_list(self):
        result = extract_entities("")
        assert result == []

    def test_whitespace_only_returns_empty_list(self):
        result = extract_entities("   \n\n\t  ")
        assert result == []

    def test_single_word_no_crash(self):
        result = extract_entities("Widget")
        assert isinstance(result, list)

    def test_very_long_text_truncated_gracefully(self):
        """Text longer than spaCy's max_length should not raise."""
        nlp = get_nlp()
        long_text = "This is a test sentence. " * (nlp.max_length // 25 + 100)
        result = extract_entities(long_text)
        assert isinstance(result, list)

    def test_numeric_only_no_crash(self):
        result = extract_entities("12345 67890 0.99")
        assert isinstance(result, list)


# ---------------------------------------------------------------------------
# Unmapped labels are filtered out
# ---------------------------------------------------------------------------

def test_gpe_loc_not_included():
    """GPE and LOC are common spaCy labels but not in our LABEL_MAP — must be filtered."""
    text = "Apple Inc. is headquartered in Cupertino, California."
    result = extract_entities(text)
    for ent in result:
        assert ent["entity_type"] in VALID_TYPES


# ---------------------------------------------------------------------------
# Real-patent extraction
# ---------------------------------------------------------------------------

class TestNerOnRealPatents:
    def test_us10156900_returns_list(self):
        text = _pdf_text(PDF_US10156900)
        result = extract_entities(text)
        assert isinstance(result, list)

    @requires_poppler
    def test_us11941918_returns_list(self):
        text = _pdf_text(PDF_US11941918)
        result = extract_entities(text)
        assert isinstance(result, list)

    def test_us10156900_spans_valid(self):
        text = _pdf_text(PDF_US10156900)
        truncated = text[: get_nlp().max_length]
        result = extract_entities(text)
        for ent in result:
            assert 0 <= ent["span_start"] < ent["span_end"] <= len(truncated), (
                f"Span out of range: {ent}"
            )

    def test_us10156900_types_valid(self):
        text = _pdf_text(PDF_US10156900)
        result = extract_entities(text)
        for ent in result:
            assert ent["entity_type"] in VALID_TYPES

    @requires_poppler
    def test_real_patents_produce_some_entities(self):
        """Real US patents should trigger at least a handful of recognizable entities."""
        text1 = _pdf_text(PDF_US10156900)
        text2 = _pdf_text(PDF_US11941918)
        r1 = extract_entities(text1)
        r2 = extract_entities(text2)
        total = len(r1) + len(r2)
        assert total >= 2, f"Expected entities from real patents, got {total} total"


# ---------------------------------------------------------------------------
# get_nlp caching
# ---------------------------------------------------------------------------

def test_get_nlp_returns_same_instance():
    nlp1 = get_nlp()
    nlp2 = get_nlp()
    assert nlp1 is nlp2, "get_nlp() should return the same cached Language instance"

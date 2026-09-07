"""
Tests for backend/app/services/embeddings.py.

Covers:
- Output length matches EMBEDDING_DIM
- Output is a list of floats
- L2 norm is approximately 1.0 (l2-normalized)
- Identical text → identical vector
- Different text → different vector
- Empty string doesn't crash
- Very long text is handled via MAX_CHARS truncation
- embed_batch returns correct number of rows
- embed_batch rows match individual embed_text calls
- Real patent text embeddings
"""

from pathlib import Path

import pytest

from app.services.embeddings import MAX_CHARS, embed_batch, embed_text
from app.core.config import get_settings

DOCS = Path(__file__).resolve().parents[2] / "docs"
PDF_US10156900 = DOCS / "US10156900.pdf"
PDF_US11941918 = DOCS / "US11941918.pdf"

from tests.test_extraction import requires_poppler

settings = get_settings()
DIM = settings.embedding_dim  # 384 by default


def _pdf_text(path: Path) -> str:
    if not path.exists():
        pytest.skip(f"PDF not found: {path}")
    from app.services.extraction import extract_text
    return extract_text(path.read_bytes(), path.name)


# ---------------------------------------------------------------------------
# embed_text
# ---------------------------------------------------------------------------

class TestEmbedText:
    def test_returns_list(self):
        result = embed_text("A method for processing data.")
        assert isinstance(result, list)

    def test_correct_dimension(self):
        result = embed_text("Test text.")
        assert len(result) == DIM, f"Expected {DIM} dims, got {len(result)}"

    def test_all_floats(self):
        result = embed_text("Some patent claims here.")
        assert all(isinstance(v, float) for v in result)

    def test_l2_norm_approx_one(self):
        """HashingVectorizer with norm='l2' produces unit vectors."""
        import math
        result = embed_text("A device comprising a sensor and a processor.")
        norm = math.sqrt(sum(v * v for v in result))
        # norm should be close to 1.0 (non-zero text)
        assert abs(norm - 1.0) < 0.01, f"Expected unit norm, got {norm}"

    def test_identical_text_identical_vector(self):
        text = "Machine learning method for image classification."
        v1 = embed_text(text)
        v2 = embed_text(text)
        assert v1 == v2

    def test_different_text_different_vector(self):
        v1 = embed_text("A method for detecting neural signals.")
        v2 = embed_text("A bicycle with an electric motor and a battery pack.")
        assert v1 != v2, "Clearly different texts should produce different embeddings"

    def test_empty_string_no_crash(self):
        """Empty string produces a zero vector (all-zero after l2 norm of zero vector)."""
        result = embed_text("")
        assert isinstance(result, list)
        assert len(result) == DIM

    def test_very_long_text_truncated(self):
        """Text beyond MAX_CHARS should still return a DIM-length vector."""
        long_text = "patent claim word " * (MAX_CHARS // 18 + 50)
        result = embed_text(long_text)
        assert len(result) == DIM

    def test_non_ascii_text_no_crash(self):
        result = embed_text("Système d'invention avec capteur ultrasonique.")
        assert len(result) == DIM


# ---------------------------------------------------------------------------
# embed_batch
# ---------------------------------------------------------------------------

class TestEmbedBatch:
    def test_returns_correct_number_of_rows(self):
        texts = ["Text one.", "Text two.", "Text three."]
        result = embed_batch(texts)
        assert len(result) == 3

    def test_each_row_correct_dimension(self):
        texts = ["Patent A.", "Patent B."]
        result = embed_batch(texts)
        for row in result:
            assert len(row) == DIM

    def test_batch_matches_individual(self):
        """embed_batch should produce the same vectors as embed_text called individually."""
        texts = ["First claim.", "Second claim.", "Third claim."]
        batch = embed_batch(texts)
        individual = [embed_text(t) for t in texts]
        assert batch == individual

    def test_single_text_batch(self):
        result = embed_batch(["Single text."])
        assert len(result) == 1
        assert len(result[0]) == DIM

    def test_empty_batch_returns_empty(self):
        result = embed_batch([])
        assert len(result) == 0

    def test_batch_with_long_texts_truncated(self):
        long_text = "claim word " * (MAX_CHARS // 10 + 100)
        result = embed_batch([long_text, long_text])
        assert len(result) == 2
        for row in result:
            assert len(row) == DIM


# ---------------------------------------------------------------------------
# Real patent embeddings
# ---------------------------------------------------------------------------

class TestEmbeddingsOnRealPatents:
    def test_us10156900_embedding_dimension(self):
        text = _pdf_text(PDF_US10156900)
        result = embed_text(text)
        assert len(result) == DIM

    @requires_poppler
    def test_us11941918_embedding_dimension(self):
        text = _pdf_text(PDF_US11941918)
        result = embed_text(text)
        assert len(result) == DIM

    @requires_poppler
    def test_two_patent_embeddings_are_different(self):
        t1 = _pdf_text(PDF_US10156900)
        t2 = _pdf_text(PDF_US11941918)
        v1 = embed_text(t1)
        v2 = embed_text(t2)
        assert v1 != v2, "Two different patents should produce different embeddings"

    @requires_poppler
    def test_cosine_similarity_is_in_range(self):
        """Cosine sim between two patent embeddings should be between -1 and 1."""
        import math
        t1 = _pdf_text(PDF_US10156900)
        t2 = _pdf_text(PDF_US11941918)
        v1 = embed_text(t1)
        v2 = embed_text(t2)
        dot = sum(a * b for a, b in zip(v1, v2))
        # Both are unit vectors so dot product == cosine similarity
        assert -1.0 <= dot <= 1.0, f"Cosine similarity out of range: {dot}"

    @requires_poppler
    def test_batch_real_patents(self):
        t1 = _pdf_text(PDF_US10156900)
        t2 = _pdf_text(PDF_US11941918)
        result = embed_batch([t1, t2])
        assert len(result) == 2
        assert result[0] != result[1]

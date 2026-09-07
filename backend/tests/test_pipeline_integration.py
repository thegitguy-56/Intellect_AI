"""
Integration tests for the full analysis pipeline.

Covers:
- /health endpoint
- /analyze endpoint: correct status transitions (404 for unknown patent, auth check)
- /patents/{id}/similarity endpoint
- /search endpoint
- /chat endpoint
- /patents/{id}/risk-detail endpoint
- /reports/generate endpoint
- Security: internal API key enforcement on protected endpoints

All database calls and storage calls are mocked — no real DB or R2 needed.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

INTERNAL_KEY = "tmB9aWt2Qr30GY9x915YYjtFHBDqr42K77PmibHIlt4="
AUTH_HEADERS = {"x-internal-api-key": INTERNAL_KEY}

FAKE_PATENT_ID = "11111111-1111-1111-1111-111111111111"
FAKE_PA_ID = "22222222-2222-2222-2222-222222222222"


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_ok(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}

    def test_health_no_auth_required(self):
        """Health endpoint is public — no API key needed."""
        r = client.get("/health", headers={})
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# Security — internal API key enforcement
# ---------------------------------------------------------------------------

class TestInternalApiKeySecurity:
    """Protected endpoints must reject requests with no/wrong API key."""

    def test_analyze_no_key_rejected(self):
        r = client.post("/analyze", json={"patent_id": FAKE_PATENT_ID})
        assert r.status_code == 401

    def test_analyze_wrong_key_rejected(self):
        r = client.post(
            "/analyze",
            json={"patent_id": FAKE_PATENT_ID},
            headers={"x-internal-api-key": "wrong-key"},
        )
        assert r.status_code == 401

    def test_search_no_key_rejected(self):
        r = client.post("/search", json={"query": "widgets"})
        assert r.status_code == 401

    def test_chat_no_key_rejected(self):
        r = client.post(
            "/chat",
            json={"patent_id": FAKE_PATENT_ID, "user_id": "u1", "message": "hello"},
        )
        assert r.status_code == 401

    def test_reports_no_key_rejected(self):
        r = client.post("/reports/generate", json={"patent_id": FAKE_PATENT_ID})
        assert r.status_code == 401

    def test_risk_detail_no_key_rejected(self):
        r = client.get(f"/patents/{FAKE_PATENT_ID}/risk-detail")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# /analyze
# ---------------------------------------------------------------------------

class TestAnalyzeEndpoint:
    def test_analyze_unknown_patent_returns_404(self):
        with patch("app.routers.patents.fetch_one", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = None
            r = client.post(
                "/analyze",
                json={"patent_id": FAKE_PATENT_ID},
                headers=AUTH_HEADERS,
            )
        assert r.status_code == 404

    def test_analyze_pipeline_error_returns_error_status(self):
        """If the pipeline raises, the endpoint returns {status: 'error'} (not 500)."""
        fake_patent = {"id": FAKE_PATENT_ID, "r2_key": "patents/u/test.pdf"}

        with patch("app.routers.patents.fetch_one", new_callable=AsyncMock) as mock_fetch, \
             patch("app.routers.patents.execute", new_callable=AsyncMock), \
             patch("app.routers.patents._run_pipeline", new_callable=AsyncMock) as mock_pipe:
            mock_fetch.return_value = fake_patent
            mock_pipe.side_effect = RuntimeError("pipeline failure")
            r = client.post(
                "/analyze",
                json={"patent_id": FAKE_PATENT_ID},
                headers=AUTH_HEADERS,
            )

        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "error"
        assert body["patent_id"] == FAKE_PATENT_ID

    def test_analyze_success_returns_analyzed_status(self):
        fake_patent = {"id": FAKE_PATENT_ID, "r2_key": "patents/u/test.pdf"}

        with patch("app.routers.patents.fetch_one", new_callable=AsyncMock) as mock_fetch, \
             patch("app.routers.patents.execute", new_callable=AsyncMock), \
             patch("app.routers.patents._run_pipeline", new_callable=AsyncMock):
            mock_fetch.return_value = fake_patent
            r = client.post(
                "/analyze",
                json={"patent_id": FAKE_PATENT_ID},
                headers=AUTH_HEADERS,
            )

        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "analyzed"
        assert body["patent_id"] == FAKE_PATENT_ID


# ---------------------------------------------------------------------------
# /patents/{id}/similarity
# ---------------------------------------------------------------------------

class TestSimilarityEndpoint:
    def test_similarity_returns_list(self):
        fake_rows = [
            {
                "id": "sr-1", "similarity_score": 0.85, "created_at": "2024-01-01",
                "prior_art_id": FAKE_PA_ID, "title": "Prior Art A",
                "source": "seed", "full_text": "Text A.", "metadata": {},
            }
        ]
        with patch("app.routers.patents.fetch_all", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [MagicMock(**row, keys=lambda: row.keys(), **{"__getitem__": lambda self, k: row[k]}) for row in fake_rows]
            # Use a simpler approach with dict rows
            mock_fetch.return_value = [dict(row) for row in fake_rows]
            r = client.get(f"/patents/{FAKE_PATENT_ID}/similarity")

        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_similarity_no_auth_required(self):
        """Similarity endpoint is public (read-only)."""
        with patch("app.routers.patents.fetch_all", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = []
            r = client.get(f"/patents/{FAKE_PATENT_ID}/similarity")
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# /search
# ---------------------------------------------------------------------------

class TestSearchEndpoint:
    def test_search_returns_results_list(self):
        fake_rows = [
            {
                "id": FAKE_PA_ID,
                "title": "Widget Patent",
                "source": "seed",
                "full_text": "A widget that does things. " * 10,
                "similarity_score": 0.78,
            }
        ]
        with patch("app.routers.search.fetch_all", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [MagicMock(**{k: v for k, v in row.items()}, **{"__getitem__": lambda self, k, row=row: row[k]}) for row in fake_rows]
            # Simpler: patch fetch_all to return asyncpg.Record-like dicts
            async def fake_fetch(q, *args):
                return fake_rows
            mock_fetch.side_effect = fake_fetch

            r = client.post(
                "/search",
                json={"query": "widget invention", "top_k": 5},
                headers=AUTH_HEADERS,
            )

        assert r.status_code == 200
        body = r.json()
        assert "results" in body

    def test_search_validates_missing_query(self):
        r = client.post("/search", json={}, headers=AUTH_HEADERS)
        assert r.status_code == 422  # pydantic validation error

    def test_search_default_top_k(self):
        """top_k has a default of 10 — omitting it should not fail validation."""
        with patch("app.routers.search.fetch_all", new_callable=AsyncMock) as mock_fetch:
            async def fake_fetch(q, *args):
                return []
            mock_fetch.side_effect = fake_fetch
            r = client.post(
                "/search",
                json={"query": "anything"},
                headers=AUTH_HEADERS,
            )
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# /patents/{id}/risk-detail
# ---------------------------------------------------------------------------

class TestRiskDetailEndpoint:
    def test_risk_detail_404_when_no_analysis(self):
        with patch("app.routers.patents.fetch_one", new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = None
            r = client.get(
                f"/patents/{FAKE_PATENT_ID}/risk-detail",
                headers=AUTH_HEADERS,
            )
        assert r.status_code == 404

    def test_risk_detail_502_when_llm_unavailable(self):
        from app.services.llm import LLMUnavailableError

        fake_analysis = {"claims_text": "1. A claim.", "background_text": "Background."}
        with patch("app.routers.patents.fetch_one", new_callable=AsyncMock) as mock_fetch, \
             patch("app.routers.patents.fetch_all", new_callable=AsyncMock) as mock_all, \
             patch("app.routers.patents.llm.risk_compliance_score") as mock_risk:
            mock_fetch.return_value = fake_analysis
            mock_all.return_value = []
            mock_risk.side_effect = LLMUnavailableError("Groq down")
            r = client.get(
                f"/patents/{FAKE_PATENT_ID}/risk-detail",
                headers=AUTH_HEADERS,
            )
        assert r.status_code == 502


# ---------------------------------------------------------------------------
# Request body validation (Pydantic)
# ---------------------------------------------------------------------------

class TestRequestValidation:
    def test_analyze_missing_patent_id_422(self):
        r = client.post("/analyze", json={}, headers=AUTH_HEADERS)
        assert r.status_code == 422

    def test_chat_missing_fields_422(self):
        r = client.post("/chat", json={"patent_id": FAKE_PATENT_ID}, headers=AUTH_HEADERS)
        assert r.status_code == 422

    def test_reports_generate_missing_patent_id_422(self):
        r = client.post("/reports/generate", json={}, headers=AUTH_HEADERS)
        assert r.status_code == 422

"""
Tests for backend/app/services/llm.py.

Covers:
- LLMUnavailableError is raised and propagated on Groq failure
- gap_analysis returns expected schema keys
- risk_compliance_score returns expected schema keys
- chat_answer returns expected schema keys
- Groq JSON parse failure raises LLMUnavailableError
- get_client() returns the same cached instance
- Prompts include the supplied content (no silent data truncation regression)

All Groq API calls are mocked — no real network requests.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.llm import (
    LLMUnavailableError,
    chat_answer,
    gap_analysis,
    get_client,
    risk_compliance_score,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_groq_response(payload: dict) -> MagicMock:
    """Build a fake Groq chat completion response wrapping `payload` as JSON."""
    msg = MagicMock()
    msg.content = json.dumps(payload)
    choice = MagicMock()
    choice.message = msg
    response = MagicMock()
    response.choices = [choice]
    return response


PRIOR_ART = [
    {"id": "pa-1", "title": "Widget Patent A", "full_text": "A widget." * 20, "similarity_score": 0.85},
    {"id": "pa-2", "title": "Gadget Patent B", "full_text": "A gadget." * 20, "similarity_score": 0.70},
]

CLAIMS_TEXT = "1. A method comprising receiving data and processing it. 2. The method of claim 1."
BACKGROUND_TEXT = "Prior art methods were inefficient."


# ---------------------------------------------------------------------------
# gap_analysis
# ---------------------------------------------------------------------------

class TestGapAnalysis:
    def test_returns_expected_keys(self):
        payload = {
            "novelty_score": 72,
            "summary": "Fairly novel.",
            "gaps": ["Gap A", "Gap B"],
            "opportunities": ["Opp A"],
        }
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = gap_analysis(CLAIMS_TEXT, PRIOR_ART)

        assert "novelty_score" in result
        assert "summary" in result
        assert "gaps" in result
        assert "opportunities" in result

    def test_novelty_score_is_numeric(self):
        payload = {"novelty_score": 55, "summary": "OK", "gaps": [], "opportunities": []}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = gap_analysis(CLAIMS_TEXT, PRIOR_ART)

        assert isinstance(result["novelty_score"], (int, float))

    def test_empty_prior_art_no_crash(self):
        payload = {"novelty_score": 90, "summary": "No prior art.", "gaps": [], "opportunities": []}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = gap_analysis(CLAIMS_TEXT, [])

        assert result["novelty_score"] == 90

    def test_groq_exception_raises_llm_unavailable(self):
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.side_effect = RuntimeError("rate limit")
            with pytest.raises(LLMUnavailableError):
                gap_analysis(CLAIMS_TEXT, PRIOR_ART)

    def test_non_json_response_raises_llm_unavailable(self):
        msg = MagicMock()
        msg.content = "not valid json at all"
        choice = MagicMock()
        choice.message = msg
        response = MagicMock()
        response.choices = [choice]

        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = response
            with pytest.raises(LLMUnavailableError):
                gap_analysis(CLAIMS_TEXT, PRIOR_ART)


# ---------------------------------------------------------------------------
# risk_compliance_score
# ---------------------------------------------------------------------------

class TestRiskComplianceScore:
    def test_returns_expected_keys(self):
        payload = {
            "risk_score": 40,
            "compliance_score": 75,
            "factors": [
                {"name": "Prior-Art Overlap", "score": 35, "explanation": "Some overlap."},
                {"name": "Claim Breadth", "score": 60, "explanation": "Moderately broad."},
            ],
        }
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = risk_compliance_score(CLAIMS_TEXT, BACKGROUND_TEXT, PRIOR_ART)

        assert "risk_score" in result
        assert "compliance_score" in result
        assert "factors" in result

    def test_factors_is_list(self):
        payload = {"risk_score": 50, "compliance_score": 60, "factors": []}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = risk_compliance_score(CLAIMS_TEXT, BACKGROUND_TEXT, PRIOR_ART)

        assert isinstance(result["factors"], list)

    def test_groq_failure_raises_llm_unavailable(self):
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.side_effect = Exception("network error")
            with pytest.raises(LLMUnavailableError):
                risk_compliance_score(CLAIMS_TEXT, BACKGROUND_TEXT, PRIOR_ART)

    def test_empty_background_no_crash(self):
        payload = {"risk_score": 30, "compliance_score": 80, "factors": []}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = risk_compliance_score(CLAIMS_TEXT, "", PRIOR_ART)

        assert "risk_score" in result


# ---------------------------------------------------------------------------
# chat_answer
# ---------------------------------------------------------------------------

class TestChatAnswer:
    def test_returns_expected_keys(self):
        payload = {"answer": "The invention relates to widgets.", "cited_prior_art_ids": ["pa-1"]}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = chat_answer("Patent context.", [], [], "What does this patent do?")

        assert "answer" in result
        assert "cited_prior_art_ids" in result

    def test_cited_ids_is_list(self):
        payload = {"answer": "Answer.", "cited_prior_art_ids": ["pa-1", "pa-2"]}
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.return_value = _make_groq_response(payload)
            result = chat_answer("Context.", PRIOR_ART, [], "Question?")

        assert isinstance(result["cited_prior_art_ids"], list)

    def test_groq_failure_raises_llm_unavailable(self):
        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.side_effect = Exception("timeout")
            with pytest.raises(LLMUnavailableError):
                chat_answer("Context.", [], [], "Question?")

    def test_history_included_in_prompt(self):
        """Verify that the history is forwarded to the LLM (not silently dropped)."""
        payload = {"answer": "Yes.", "cited_prior_art_ids": []}
        calls = []

        def fake_create(**kwargs):
            calls.append(kwargs)
            return _make_groq_response(payload)

        with patch("app.services.llm.get_client") as mock_get:
            mock_get.return_value.chat.completions.create.side_effect = fake_create
            history = [{"role": "user", "content": "Previous question"}]
            chat_answer("Context.", [], history, "Follow-up question?")

        assert calls, "create() should have been called"
        user_msg = calls[0]["messages"][1]["content"]
        assert "Previous question" in user_msg, "History should appear in the user prompt"


# ---------------------------------------------------------------------------
# LLMUnavailableError
# ---------------------------------------------------------------------------

def test_llm_unavailable_error_is_exception():
    err = LLMUnavailableError("test message")
    assert isinstance(err, Exception)
    assert "test message" in str(err)


# ---------------------------------------------------------------------------
# get_client caching
# ---------------------------------------------------------------------------

def test_get_client_returns_cached_instance():
    """get_client() should return the same object on repeated calls."""
    with patch("app.services.llm._client", None):
        with patch("app.services.llm.Groq") as mock_groq_cls:
            mock_instance = MagicMock()
            mock_groq_cls.return_value = mock_instance
            c1 = get_client()
            c2 = get_client()
            # After the first call, Groq() should not be called again
            assert mock_groq_cls.call_count == 1
            assert c1 is c2

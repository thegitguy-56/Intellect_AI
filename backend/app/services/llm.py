import json
import logging

from groq import Groq

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


class LLMUnavailableError(Exception):
    """Raised when Groq fails or rate-limits — callers show a clear error
    state rather than letting the pipeline crash (see build plan Section 6:
    non-functional requirements)."""


def _chat_json(system_prompt: str, user_prompt: str) -> dict:
    client = get_client()
    try:
        response = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
    except Exception as exc:  # Groq SDK raises various API/rate-limit errors
        logger.warning("Groq call failed: %s", exc)
        raise LLMUnavailableError(str(exc)) from exc

    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Groq returned non-JSON content: %s", content)
        raise LLMUnavailableError("Model returned malformed JSON") from exc


def gap_analysis(claims_text: str, prior_art: list[dict]) -> dict:
    """Returns {novelty_score: 0-100, summary: str, gaps: [...], opportunities: [...]}"""
    prior_art_block = "\n\n".join(
        f"[{p['id']}] {p['title']} (similarity {p['similarity_score']:.2f})\n{p['full_text'][:800]}"
        for p in prior_art
    ) or "No closely related prior art was found in the corpus."

    system_prompt = (
        "You are a patent analyst assistant. Compare a patent's claims against "
        "retrieved prior art and produce a structured novelty/gap analysis. "
        "Respond with ONLY a JSON object matching this shape: "
        '{"novelty_score": <0-100 integer>, "summary": <string>, '
        '"gaps": [<string>, ...], "opportunities": [<string>, ...]}. '
        "novelty_score: 100 = highly novel vs. the retrieved prior art, "
        "0 = essentially identical to existing prior art."
    )
    user_prompt = f"CLAIMS:\n{claims_text[:4000]}\n\nRETRIEVED PRIOR ART:\n{prior_art_block}"
    return _chat_json(system_prompt, user_prompt)


def risk_compliance_score(claims_text: str, background_text: str, prior_art: list[dict]) -> dict:
    """Returns {risk_score, compliance_score, factors: [{name, score, explanation}]}"""
    prior_art_block = "\n\n".join(
        f"[{p['id']}] {p['title']} (similarity {p['similarity_score']:.2f})"
        for p in prior_art
    ) or "No closely related prior art was found in the corpus."

    system_prompt = (
        "You are a patent risk/compliance analyst. Given a patent's claims and "
        "background plus its closest prior art, produce a structured risk "
        "assessment. Respond with ONLY a JSON object matching this shape: "
        '{"risk_score": <0-100 integer, higher = riskier>, '
        '"compliance_score": <0-100 integer, higher = more compliant>, '
        '"factors": [{"name": <string>, "score": <0-100 integer>, '
        '"explanation": <string>}, ...]}. '
        "Include factors like Prior-Art Overlap, Claim Breadth, and "
        "Documentation Completeness."
    )
    user_prompt = (
        f"CLAIMS:\n{claims_text[:3000]}\n\nBACKGROUND:\n{background_text[:1500]}\n\n"
        f"CLOSEST PRIOR ART:\n{prior_art_block}"
    )
    return _chat_json(system_prompt, user_prompt)


def chat_answer(
    patent_context: str,
    prior_art_context: list[dict],
    history: list[dict],
    question: str,
) -> dict:
    """RAG-style chat. Returns {answer: str, cited_prior_art_ids: [str, ...]}"""
    context_block = "\n\n".join(
        f"[{p['id']}] {p['title']}\n{p['full_text'][:800]}" for p in prior_art_context
    ) or "No related prior art retrieved."

    system_prompt = (
        "You are IntellectFlow's patent research assistant. Answer questions "
        "about the user's patent using the provided patent text and retrieved "
        "prior-art context. Cite prior art by its bracketed ID when you rely on "
        "it. Respond with ONLY a JSON object: "
        '{"answer": <string>, "cited_prior_art_ids": [<string>, ...]}. '
        "If the context doesn't contain the answer, say so plainly in `answer` "
        "rather than guessing."
    )
    history_block = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in history[-10:])
    user_prompt = (
        f"PATENT CONTEXT:\n{patent_context[:3000]}\n\n"
        f"RETRIEVED PRIOR ART:\n{context_block}\n\n"
        f"CONVERSATION SO FAR:\n{history_block}\n\n"
        f"QUESTION: {question}"
    )
    return _chat_json(system_prompt, user_prompt)

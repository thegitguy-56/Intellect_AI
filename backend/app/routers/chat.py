import json

from fastapi import APIRouter, Depends, HTTPException

from app.core.db import execute, fetch_all, fetch_one
from app.core.security import require_internal_api_key
from app.models.schemas import ChatRequest, ChatResponse
from app.services import embeddings, llm
from app.services.llm import LLMUnavailableError

router = APIRouter(tags=["chat"], dependencies=[Depends(require_internal_api_key)])

CHAT_TOP_K = 5


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    patent = await fetch_one(
        "SELECT p.title, pa.extracted_text, pa.claims_text, pa.abstract_text "
        "FROM patents p LEFT JOIN patent_analysis pa ON pa.patent_id = p.id "
        "WHERE p.id = $1",
        request.patent_id,
    )
    if patent is None:
        raise HTTPException(status_code=404, detail="Patent not found")

    patent_context = (
        f"{patent['title']}\n\n"
        f"{patent['claims_text'] or ''}\n\n{patent['abstract_text'] or patent['extracted_text'] or ''}"
    )

    # Retrieve prior-art chunks relevant to THIS question (not just the
    # patent's claims), for more targeted RAG answers.
    question_embedding = embeddings.embed_text(request.message)
    prior_art_rows = await fetch_all(
        """
        SELECT id, title, full_text, 1 - (embedding <=> $1::vector) AS similarity_score
        FROM prior_art_corpus
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        question_embedding,
        CHAT_TOP_K,
    )
    prior_art_context = [
        {"id": str(row["id"]), "title": row["title"], "full_text": row["full_text"]}
        for row in prior_art_rows
    ]

    history_rows = await fetch_all(
        "SELECT role, content FROM chat_messages WHERE patent_id = $1 ORDER BY created_at ASC LIMIT 20",
        request.patent_id,
    )
    history = [{"role": row["role"], "content": row["content"]} for row in history_rows]

    await execute(
        "INSERT INTO chat_messages (patent_id, user_id, role, content, cited_prior_art_ids) "
        "VALUES ($1, $2, 'user', $3, '[]')",
        request.patent_id,
        request.user_id,
        request.message,
    )

    try:
        result = llm.chat_answer(patent_context, prior_art_context, history, request.message)
        answer = str(result.get("answer", "")).strip()
        cited_ids = [str(cid) for cid in result.get("cited_prior_art_ids", [])]
    except LLMUnavailableError:
        answer = (
            "The AI assistant is temporarily unavailable (the Groq API failed or "
            "rate-limited this request). Please try again in a moment."
        )
        cited_ids = []

    await execute(
        "INSERT INTO chat_messages (patent_id, user_id, role, content, cited_prior_art_ids) "
        "VALUES ($1, $2, 'assistant', $3, $4)",
        request.patent_id,
        request.user_id,
        answer,
        json.dumps(cited_ids),
    )

    return ChatResponse(answer=answer, cited_prior_art_ids=cited_ids)


@router.get("/patents/{patent_id}/chat")
async def get_chat_history(patent_id: str) -> list[dict]:
    rows = await fetch_all(
        "SELECT id, role, content, cited_prior_art_ids, created_at "
        "FROM chat_messages WHERE patent_id = $1 ORDER BY created_at ASC",
        patent_id,
    )
    return [dict(row) for row in rows]

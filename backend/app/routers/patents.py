import logging

from fastapi import APIRouter, Depends, HTTPException

from app.core.db import execute, fetch_all, fetch_one, transaction
from app.core.security import require_internal_api_key
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services import embeddings, extraction, llm, ner, sectioning, storage
from app.services.llm import LLMUnavailableError

router = APIRouter(tags=["patents"])
logger = logging.getLogger(__name__)

TOP_K_PRIOR_ART = 8


@router.post("/analyze", response_model=AnalyzeResponse, dependencies=[Depends(require_internal_api_key)])
async def analyze_patent(request: AnalyzeRequest) -> AnalyzeResponse:
    patent = await fetch_one("SELECT * FROM patents WHERE id = $1", request.patent_id)
    if patent is None:
        raise HTTPException(status_code=404, detail="Patent not found")

    await execute("UPDATE patents SET status = 'processing' WHERE id = $1", request.patent_id)

    try:
        await _run_pipeline(request.patent_id, patent["r2_key"])
    except Exception:
        logger.exception("Analysis pipeline failed for patent %s", request.patent_id)
        await execute("UPDATE patents SET status = 'error' WHERE id = $1", request.patent_id)
        return AnalyzeResponse(patent_id=request.patent_id, status="error")

    return AnalyzeResponse(patent_id=request.patent_id, status="analyzed")


async def _run_pipeline(patent_id: str, r2_key: str) -> None:
    # 1. Extract text (PDF/DOCX/OCR fallback)
    file_bytes = storage.download_file(r2_key)
    filename = r2_key.rsplit("/", 1)[-1]
    full_text = extraction.extract_text(file_bytes, filename)

    # 2. Rule-based section splitting
    sections = sectioning.split_sections(full_text)
    claims_text = sections.claims or ""
    abstract_text = sections.abstract or ""
    background_text = sections.background or ""

    # 3. NER over the full text
    entities = ner.extract_entities(full_text)

    # 4. Embeddings for claims + abstract (fall back to full text if a
    # section wasn't detected, so search still works)
    claims_source = claims_text or full_text
    abstract_source = abstract_text or full_text
    claims_embedding = embeddings.embed_text(claims_source)
    abstract_embedding = embeddings.embed_text(abstract_source)

    # 5. Prior-art similarity search (cosine distance via pgvector <=>)
    prior_art_rows = await fetch_all(
        """
        SELECT id, title, full_text, 1 - (embedding <=> $1::vector) AS similarity_score
        FROM prior_art_corpus
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        claims_embedding,
        TOP_K_PRIOR_ART,
    )
    prior_art = [
        {
            "id": str(row["id"]),
            "title": row["title"],
            "full_text": row["full_text"],
            "similarity_score": float(row["similarity_score"]),
        }
        for row in prior_art_rows
    ]

    # 6. Groq: novelty/gap analysis + risk/compliance scoring. Degrade
    # gracefully — a Groq outage shouldn't block extraction/NER/search
    # results the user can already see (build plan Section 6).
    novelty_score: float | None = None
    risk_score: float | None = None
    compliance_score: float | None = None
    try:
        gap = llm.gap_analysis(claims_source, prior_art)
        novelty_score = float(gap.get("novelty_score")) if gap.get("novelty_score") is not None else None
    except LLMUnavailableError:
        logger.warning("Gap analysis unavailable for patent %s (Groq failure)", patent_id)

    try:
        risk = llm.risk_compliance_score(claims_source, background_text, prior_art)
        risk_score = float(risk.get("risk_score")) if risk.get("risk_score") is not None else None
        compliance_score = (
            float(risk.get("compliance_score")) if risk.get("compliance_score") is not None else None
        )
    except LLMUnavailableError:
        logger.warning("Risk scoring unavailable for patent %s (Groq failure)", patent_id)

    # --- Persist everything atomically — readers should never see a patent
    # with (say) a scored patent_analysis row but stale/missing entities, or
    # status still 'processing' after the data already landed. ---
    async with transaction() as conn:
        await conn.execute("DELETE FROM patent_entities WHERE patent_id = $1", patent_id)
        await conn.execute("DELETE FROM patent_embeddings WHERE patent_id = $1", patent_id)
        await conn.execute("DELETE FROM similarity_results WHERE patent_id = $1", patent_id)
        await conn.execute("DELETE FROM patent_analysis WHERE patent_id = $1", patent_id)

        await conn.execute(
            """
            INSERT INTO patent_analysis
                (patent_id, extracted_text, claims_text, abstract_text, background_text,
                 novelty_score, risk_score, compliance_score)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            patent_id,
            full_text,
            claims_text or None,
            abstract_text or None,
            background_text or None,
            novelty_score,
            risk_score,
            compliance_score,
        )

        for entity in entities:
            await conn.execute(
                """
                INSERT INTO patent_entities
                    (patent_id, entity_type, entity_value, span_start, span_end)
                VALUES ($1, $2, $3, $4, $5)
                """,
                patent_id,
                entity["entity_type"],
                entity["entity_value"],
                entity["span_start"],
                entity["span_end"],
            )

        await conn.execute(
            "INSERT INTO patent_embeddings (patent_id, embedding, source_section) VALUES ($1, $2, 'claims')",
            patent_id,
            claims_embedding,
        )
        await conn.execute(
            "INSERT INTO patent_embeddings (patent_id, embedding, source_section) VALUES ($1, $2, 'abstract')",
            patent_id,
            abstract_embedding,
        )

        for item in prior_art:
            await conn.execute(
                """
                INSERT INTO similarity_results (patent_id, prior_art_id, similarity_score)
                VALUES ($1, $2, $3)
                """,
                patent_id,
                item["id"],
                item["similarity_score"],
            )

        await conn.execute("UPDATE patents SET status = 'analyzed' WHERE id = $1", patent_id)


@router.get("/patents/{patent_id}/risk-detail", dependencies=[Depends(require_internal_api_key)])
async def get_risk_detail(patent_id: str) -> dict:
    """Regenerates the per-factor risk/compliance breakdown on demand rather
    than persisting it — patent_analysis only stores the two aggregate
    scores (matches build plan Section 4 schema), and this keeps the Groq
    call reserved for when someone actually opens the Risk tab."""
    analysis = await fetch_one(
        "SELECT claims_text, background_text FROM patent_analysis WHERE patent_id = $1", patent_id
    )
    if analysis is None:
        raise HTTPException(status_code=404, detail="Patent has not been analyzed yet")

    prior_art_rows = await fetch_all(
        """
        SELECT pac.id, pac.title, sr.similarity_score
        FROM similarity_results sr
        JOIN prior_art_corpus pac ON pac.id = sr.prior_art_id
        WHERE sr.patent_id = $1
        ORDER BY sr.similarity_score DESC
        LIMIT 5
        """,
        patent_id,
    )
    prior_art = [
        {"id": str(row["id"]), "title": row["title"], "similarity_score": float(row["similarity_score"])}
        for row in prior_art_rows
    ]

    try:
        return llm.risk_compliance_score(
            analysis["claims_text"] or "", analysis["background_text"] or "", prior_art
        )
    except LLMUnavailableError as exc:
        raise HTTPException(status_code=502, detail="AI risk analysis is temporarily unavailable") from exc


@router.get("/patents/{patent_id}/similarity")
async def get_similarity_results(patent_id: str) -> list[dict]:
    rows = await fetch_all(
        """
        SELECT sr.id, sr.similarity_score, sr.created_at,
               pac.id AS prior_art_id, pac.title, pac.source, pac.full_text, pac.metadata
        FROM similarity_results sr
        JOIN prior_art_corpus pac ON pac.id = sr.prior_art_id
        WHERE sr.patent_id = $1
        ORDER BY sr.similarity_score DESC
        """,
        patent_id,
    )
    return [dict(row) for row in rows]

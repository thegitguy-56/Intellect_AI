import json
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.db import fetch_all, fetch_one
from app.core.security import require_internal_api_key
from app.models.schemas import ReportGenerateRequest, ReportGenerateResponse
from app.services import reports, storage

router = APIRouter(tags=["reports"], dependencies=[Depends(require_internal_api_key)])


@router.post("/reports/generate", response_model=ReportGenerateResponse)
async def generate_report(request: ReportGenerateRequest) -> ReportGenerateResponse:
    patent = await fetch_one("SELECT id, title FROM patents WHERE id = $1", request.patent_id)
    if patent is None:
        raise HTTPException(status_code=404, detail="Patent not found")

    analysis_row = await fetch_one(
        "SELECT * FROM patent_analysis WHERE patent_id = $1", request.patent_id
    )
    analysis = dict(analysis_row) if analysis_row else None

    entity_rows = await fetch_all(
        "SELECT entity_type, entity_value FROM patent_entities WHERE patent_id = $1", request.patent_id
    )
    entities = [dict(row) for row in entity_rows]

    prior_art_rows = await fetch_all(
        """
        SELECT pac.title, sr.similarity_score
        FROM similarity_results sr
        JOIN prior_art_corpus pac ON pac.id = sr.prior_art_id
        WHERE sr.patent_id = $1
        ORDER BY sr.similarity_score DESC
        """,
        request.patent_id,
    )
    prior_art = [dict(row) for row in prior_art_rows]

    pdf_bytes = reports.generate_pdf(dict(patent), analysis, entities, prior_art, request.sections)

    report_key = f"reports/{request.patent_id}/{uuid.uuid4()}.pdf"
    storage.upload_bytes(report_key, pdf_bytes, "application/pdf")
    report_url = storage.generate_presigned_get_url(report_key, expires_in=60 * 60 * 24 * 7)

    row = await fetch_one(
        """
        INSERT INTO reports (patent_id, report_url, sections_included)
        VALUES ($1, $2, $3)
        RETURNING id
        """,
        request.patent_id,
        report_key,
        json.dumps(request.sections),
    )

    return ReportGenerateResponse(report_id=str(row["id"]), report_url=report_url)

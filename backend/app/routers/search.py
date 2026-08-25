from fastapi import APIRouter, Depends

from app.core.db import fetch_all
from app.core.security import require_internal_api_key
from app.models.schemas import SearchRequest, SearchResponse, SearchResultItem
from app.services import embeddings

router = APIRouter(tags=["search"], dependencies=[Depends(require_internal_api_key)])


@router.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest) -> SearchResponse:
    """Ad-hoc semantic search over the prior-art corpus (used by the global
    search / command-palette UI) — separate from the per-patent similarity
    results computed once at analysis time and stored in similarity_results."""
    query_embedding = embeddings.embed_text(request.query)

    rows = await fetch_all(
        """
        SELECT id, title, source, full_text, 1 - (embedding <=> $1::vector) AS similarity_score
        FROM prior_art_corpus
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
        """,
        query_embedding,
        request.top_k,
    )

    results = [
        SearchResultItem(
            id=str(row["id"]),
            title=row["title"],
            source=row["source"],
            similarity_score=float(row["similarity_score"]),
            snippet=row["full_text"][:280],
        )
        for row in rows
    ]
    return SearchResponse(results=results)

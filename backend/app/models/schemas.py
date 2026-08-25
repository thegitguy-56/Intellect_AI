from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    patent_id: str


class AnalyzeResponse(BaseModel):
    patent_id: str
    status: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 10


class SearchResultItem(BaseModel):
    id: str
    title: str
    source: str
    similarity_score: float
    snippet: str


class SearchResponse(BaseModel):
    results: list[SearchResultItem]


class ChatRequest(BaseModel):
    patent_id: str
    user_id: str
    message: str


class ChatResponse(BaseModel):
    answer: str
    cited_prior_art_ids: list[str]


class ReportGenerateRequest(BaseModel):
    patent_id: str
    sections: list[str] = [
        "summary",
        "entities",
        "prior_art",
        "risk_compliance",
        "recommendations",
    ]


class ReportGenerateResponse(BaseModel):
    report_id: str
    report_url: str

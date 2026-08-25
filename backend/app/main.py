from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import health

settings = get_settings()

app = FastAPI(title="Patent Analysis NLP Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)

# Routers land here phase by phase:
# app.include_router(patents.router, prefix="/patents", tags=["patents"])
# app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
# app.include_router(search.router, prefix="/search", tags=["search"])
# app.include_router(chat.router, prefix="/chat", tags=["chat"])
# app.include_router(reports.router, prefix="/reports", tags=["reports"])

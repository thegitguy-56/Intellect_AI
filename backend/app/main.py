import asyncio
import platform
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.db import close_pool, init_pool
from app.routers import chat, health, patents, reports, search

logger = logging.getLogger(__name__)

# Windows ProactorEventLoop has a known bug timing out on IPv6 SSL connections
# (asyncpg → Neon). SelectorEventLoop handles them correctly.
if platform.system() == "Windows":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Attempt to pre-warm the DB pool. On Neon free tier the compute may be
    # sleeping — a cold start can take 30-50s and the first connect may time
    # out. We catch that here so uvicorn starts successfully regardless; the
    # pool will be initialized lazily on the first incoming request instead.
    try:
        await init_pool()
        logger.info("DB pool initialized at startup.")
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "DB pool could not be initialized at startup (Neon cold start?): %s. "
            "Will retry on first request.",
            exc,
        )
    yield
    await close_pool()


app = FastAPI(title="Patent Analysis NLP Service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(patents.router)
app.include_router(search.router)
app.include_router(chat.router)
app.include_router(reports.router)

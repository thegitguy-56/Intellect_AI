from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# Neon's pooled connection string uses the standard postgres:// scheme;
# swap in the asyncpg driver for SQLAlchemy's async engine.
_async_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://").replace(
    "postgres://", "postgresql+asyncpg://"
)

engine = create_async_engine(_async_url, pool_pre_ping=True) if settings.database_url else None
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False) if engine else None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")
    async with SessionLocal() as session:
        yield session

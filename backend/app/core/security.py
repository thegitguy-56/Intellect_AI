from fastapi import Header, HTTPException, status

from app.core.config import get_settings

settings = get_settings()


async def require_internal_api_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    """Gate internal-only endpoints (e.g. /analyze) so only our own Next.js
    backend can call them, not the public internet."""
    if not settings.internal_api_key or x_internal_api_key != settings.internal_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal API key")

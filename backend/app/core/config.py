from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database (Neon Postgres, pooled connection string)
    database_url: str = ""

    # Cloudflare R2 (S3-compatible)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_endpoint_url: str = ""

    # Groq LLM
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Embeddings (HashingVectorizer — see app/services/embeddings.py; no
    # trained model, so only the output dimension is configurable)
    embedding_dim: int = 384

    # spaCy
    spacy_model_name: str = "en_core_web_sm"

    # Shared secret so only the Next.js backend can call internal endpoints
    internal_api_key: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()

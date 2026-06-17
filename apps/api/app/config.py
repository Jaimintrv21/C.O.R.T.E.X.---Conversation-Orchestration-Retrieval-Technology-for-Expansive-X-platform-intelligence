"""
C.O.R.T.E.X. application configuration.
All settings are loaded from environment variables with the C.O.R.T.E.X._ prefix.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration — mirrors .env.example."""

    model_config = SettingsConfigDict(
        env_prefix="C.O.R.T.E.X._",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────────────────────
    app_name: str = "C.O.R.T.E.X."
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    secret_key: str = "change-me-in-production"
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = ["http://localhost:3000"]

    # ── Database ─────────────────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://cortex:cortex@localhost:5432/cortex"
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_echo: bool = False

    # ── Redis ────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── JWT ──────────────────────────────────────────────────────────────
    jwt_algorithm: str = "RS256"
    jwt_private_key_path: str = "keys/private.pem"
    jwt_public_key_path: str = "keys/public.pem"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # ── Encryption ───────────────────────────────────────────────────────
    master_encryption_key: str = "change-me-32-byte-key-in-prod!!"  # 32 bytes

    # ── Meilisearch ──────────────────────────────────────────────────────
    meilisearch_url: str = "http://localhost:7700"
    meilisearch_api_key: str = "cortex-meili-key"

    # ── MinIO ────────────────────────────────────────────────────────────
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "cortex"
    minio_secret_key: str = "cortex-secret"
    minio_bucket: str = "cortex-uploads"
    minio_secure: bool = False

    # ── Ollama ───────────────────────────────────────────────────────────
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # ── Embeddings ───────────────────────────────────────────────────────
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384
    embedding_batch_size: int = 64

    # ── Rate Limiting ────────────────────────────────────────────────────
    rate_limit_authenticated: int = 100  # req/min
    rate_limit_unauthenticated: int = 10  # req/min

    # ── Upload ───────────────────────────────────────────────────────────
    max_upload_size_mb: int = 500
    upload_temp_dir: str = "/tmp/cortex-uploads"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Singleton settings instance."""
    return Settings()

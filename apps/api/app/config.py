"""Application configuration."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the API and workers."""

    model_config = SettingsConfigDict(
        env_prefix="C.O.R.T.E.X._",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "C.O.R.T.E.X."
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    secret_key: str = "change-me-in-production"
    api_prefix: str = "/api/v1"
    allowed_origins: list[str] = ["http://localhost:3000"]

    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_username: str = "neo4j"
    neo4j_password: str = "password"
    neo4j_database: str = "neo4j"

    firebase_project_id: str | None = None
    firebase_storage_bucket: str | None = None
    firebase_service_account_path: str | None = None
    firebase_service_account_json: str | None = None

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    auth0_domain: str = ""
    auth0_audience: str = ""
    auth0_client_id: str = ""
    auth0_client_secret: str = ""
    auth0_database_connection: str = "Username-Password-Authentication"
    auth0_jwks_cache_ttl_seconds: int = 86_400
    extension_token_secret: str = "change-me-extension-token-secret"
    extension_token_audience: str = "cortex-extension-ingest"
    extension_token_ttl_days: int = 30

    master_encryption_key: str = "change-me-32-byte-key-in-prod!!"

    meilisearch_url: str = "http://localhost:7700"
    meilisearch_api_key: str = "cortex-meili-key"

    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "cortex"
    minio_secret_key: str = "cortex-secret"
    minio_bucket: str = "cortex-uploads"
    minio_secure: bool = False

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    ai_local_only: bool = True
    litellm_api_base: str | None = None
    litellm_api_key: str | None = None
    llm_summarization_model: str = "ollama/llama3.2:3b"
    llm_topic_extraction_model: str = "ollama/mistral:7b"
    llm_artifact_generation_model: str = "ollama/llama3.1:8b"
    llm_knowledge_graph_model: str = "ollama/qwen2.5:7b"
    llm_fallback_model: str = "openai/gpt-4o-mini"

    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_high_quality_model: str = "nomic-ai/nomic-embed-text-v1.5"
    embedding_cloud_model: str = "openai/text-embedding-3-small"
    embedding_dimensions: int = 384
    embedding_high_quality_dimensions: int = 768
    embedding_batch_size: int = 64
    embedding_chunk_size_tokens: int = 512
    embedding_chunk_overlap_tokens: int = 64
    embedding_queue_max_size: int = 1024

    artifact_storage_prefix: str = "artifacts"

    rate_limit_authenticated: int = 100
    rate_limit_unauthenticated: int = 10
    rate_limit_extension: int = 30

    max_upload_size_mb: int = 500
    upload_temp_dir: str = "/tmp/cortex-uploads"

    extra_headers: dict[str, str] = Field(default_factory=dict)

    @computed_field
    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()

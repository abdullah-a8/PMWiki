from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing_extensions import Self
from typing import List
import json
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "PMWiki RAG API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str
    POSTGRES_USER: str = "pmwiki"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "pmwiki"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    
    # Optional Database URLs (for backward compatibility)
    SUPABASE_URL: str | None = None
    LOCAL_DATABASE_URL: str | None = None

    # Vector Database
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "pmwiki_embeddings"
    QDRANT_API_KEY: str | None = None  # Optional for cloud Qdrant

    # API Keys
    GROQ_API_KEY: str
    VOYAGE_API_KEY: str

    # CORS - will be parsed from JSON string in env variable
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"]

    # Rate Limiting
    GROQ_RATE_LIMIT: int = 1000  # requests per day
    VOYAGE_RATE_LIMIT: int = 1000000  # tokens per month

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env (Pydantic v2)

    @model_validator(mode='after')
    def validate_database_config(self) -> Self:
        """Validate that either database URL or individual connection params are provided."""
        has_url = self.SUPABASE_URL or self.LOCAL_DATABASE_URL or self.DATABASE_URL
        has_individual = all([
            self.POSTGRES_USER,
            self.POSTGRES_PASSWORD is not None and self.POSTGRES_PASSWORD != "",
            self.POSTGRES_DB,
            self.POSTGRES_HOST
        ])

        if not (has_url or has_individual):
            raise ValueError(
                "Database configuration incomplete: Must provide either "
                "DATABASE_URL/SUPABASE_URL/LOCAL_DATABASE_URL or individual Postgres connection parameters "
                "(POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST)"
            )
        return self

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse ALLOWED_HOSTS from JSON string if provided as string
        allowed_hosts_env = os.getenv("ALLOWED_HOSTS")
        if allowed_hosts_env and isinstance(allowed_hosts_env, str):
            try:
                self.ALLOWED_HOSTS = json.loads(allowed_hosts_env)
            except json.JSONDecodeError:
                # If not valid JSON, try comma-separated values
                self.ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(",")]


settings = Settings()
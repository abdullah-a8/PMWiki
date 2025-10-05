from pydantic_settings import BaseSettings
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

    # Vector Database
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION_NAME: str = "pmwiki_embeddings"

    # API Keys
    GROQ_API_KEY: str
    VOYAGE_API_KEY: str

    # CORS - will be parsed from JSON string in env variable
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"]

    # Rate Limiting
    GROQ_RATE_LIMIT: int = 1000  # requests per day
    VOYAGE_RATE_LIMIT: int = 1000000  # tokens per month

    class Config:
        env_file = ".env"  # Corrected path for env file
        case_sensitive = True

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
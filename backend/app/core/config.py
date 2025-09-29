from pydantic import BaseSettings
from typing import List


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

    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Rate Limiting
    GROQ_RATE_LIMIT: int = 1000  # requests per day
    VOYAGE_RATE_LIMIT: int = 1000000  # tokens per month

    class Config:
        env_file = "../.env"
        case_sensitive = True


settings = Settings()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.routers import search, health, comparisons, process, graph
from app.services.voyage_service import get_voyage_service
from app.services.qdrant_service import get_qdrant_service
from app.services.groq_service import get_groq_service
# TODO: Re-enable after implementing schemas
# from app.routers import citations

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Eagerly initializes services at startup to eliminate first-request delays.
    """
    # Startup
    logger.info("🚀 Initializing services at startup...")
    try:
        get_voyage_service()
        get_qdrant_service()
        get_groq_service()
        logger.info("✅ All services initialized successfully")
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {e}")
        # Don't crash - services will lazy-load if startup fails

    yield

    # Shutdown
    logger.info("👋 Application shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Citation-focused RAG system for PMBOK, PRINCE2, and ISO 21502 comparison",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(search.router, prefix=settings.API_V1_STR, tags=["search"])
app.include_router(comparisons.router, prefix=settings.API_V1_STR, tags=["comparisons"])
app.include_router(process.router, prefix=settings.API_V1_STR, tags=["process"])
app.include_router(graph.router, prefix=f"{settings.API_V1_STR}/graph", tags=["graph"])
# TODO: Re-enable after implementing Phase 3.2 citations management
# app.include_router(citations.router, prefix=settings.API_V1_STR, tags=["citations"])


@app.get("/")
async def root():
    return {"message": "PMWiki Citation-focused RAG API", "version": settings.VERSION}
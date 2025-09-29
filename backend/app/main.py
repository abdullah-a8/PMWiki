from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import search, citations, comparisons, health

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Citation-focused RAG system for PMBOK, PRINCE2, and ISO 21502 comparison",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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
app.include_router(health.router, tags=["health"])
app.include_router(search.router, prefix=settings.API_V1_STR, tags=["search"])
app.include_router(citations.router, prefix=settings.API_V1_STR, tags=["citations"])
app.include_router(comparisons.router, prefix=settings.API_V1_STR, tags=["comparisons"])


@app.get("/")
async def root():
    return {"message": "PMWiki Citation-focused RAG API", "version": settings.VERSION}
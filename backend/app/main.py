from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import search, health, comparisons, process, graph
# TODO: Re-enable after implementing schemas
# from app.routers import citations

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
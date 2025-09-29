from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "service": "PMWiki RAG API", "version": settings.VERSION}


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check including database connectivity"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # TODO: Add checks for Qdrant, Groq, and Voyage AI services

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "PMWiki RAG API",
        "version": settings.VERSION,
        "checks": {
            "database": db_status,
            "qdrant": "not_implemented",
            "groq": "not_implemented",
            "voyage": "not_implemented"
        }
    }
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db, check_db_connection
from app.core.config import settings
from app.services.voyage_service import get_voyage_service
from app.services.qdrant_service import get_qdrant_service
from app.services.groq_service import get_groq_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    Also keeps services warm by maintaining singleton references.
    """
    try:
        # Keep services warm (singleton pattern - no API calls, just returns cached instances)
        get_voyage_service()
        get_qdrant_service()
        get_groq_service()
    except Exception as e:
        logger.warning(f"Service warming failed during health check: {e}")

    return {"status": "healthy", "service": "PMWiki RAG API", "version": settings.VERSION}


@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check including database connectivity"""
    try:
        # Test database connection using SQLAlchemy 2.0 syntax
        result = db.execute(text("SELECT 1"))
        result.fetchone()  # Ensure the query actually executes
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Test API service connectivity (future implementation)
    # TODO: Add actual checks for external services
    qdrant_status = "not_implemented"
    groq_status = "not_implemented"
    voyage_status = "not_implemented"

    # Determine overall status
    overall_status = "healthy" if db_status == "healthy" else "degraded"

    return {
        "status": overall_status,
        "service": "PMWiki RAG API",
        "version": settings.VERSION,
        "checks": {
            "database": db_status,
            "qdrant": qdrant_status,
            "groq": groq_status,
            "voyage": voyage_status
        }
    }


@router.get("/health/db-only")
async def database_health_check():
    """Quick database connectivity check without dependency injection"""
    db_healthy = check_db_connection()
    return {
        "database_healthy": db_healthy,
        "status": "healthy" if db_healthy else "unhealthy"
    }
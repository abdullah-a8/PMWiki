from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.comparisons import TopicComparisonRequest, SectionComparisonRequest, ComparisonResponse
from app.services.comparisons import ComparisonService
from app.dependencies import get_db, get_groq_client, get_qdrant_client
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/compare/{topic}", response_model=ComparisonResponse)
async def compare_topic_across_standards(
    topic: str,
    db: Session = Depends(get_db),
    groq_client=Depends(get_groq_client),
    qdrant_client=Depends(get_qdrant_client)
):
    """Compare how a specific topic is handled across PMBOK, PRINCE2, and ISO 21502"""
    comparison_service = ComparisonService(db, groq_client, qdrant_client)
    try:
        comparison = await comparison_service.compare_topic(topic=topic)
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Topic comparison failed: {str(e)}")


@router.post("/compare-sections", response_model=ComparisonResponse)
async def compare_specific_sections(
    request: SectionComparisonRequest,
    db: Session = Depends(get_db),
    groq_client=Depends(get_groq_client)
):
    """Compare specific sections from different standards"""
    comparison_service = ComparisonService(db, groq_client, None)
    try:
        comparison = await comparison_service.compare_sections(
            section_ids=request.section_ids,
            comparison_type=request.comparison_type
        )
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Section comparison failed: {str(e)}")


@router.get("/similarities/{section_id}")
async def find_similar_sections(
    section_id: str,
    limit: int = 10,
    min_similarity: float = 0.7,
    db: Session = Depends(get_db),
    qdrant_client=Depends(get_qdrant_client)
):
    """Find sections similar to a given section across all standards"""
    comparison_service = ComparisonService(db, None, qdrant_client)
    try:
        similarities = await comparison_service.find_similar_sections(
            section_id=section_id,
            limit=limit,
            min_similarity=min_similarity
        )
        return {"section_id": section_id, "similar_sections": similarities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity search failed: {str(e)}")


@router.get("/gap-analysis/{standard}")
async def perform_gap_analysis(
    standard: str,
    compare_with: List[str],
    db: Session = Depends(get_db),
    groq_client=Depends(get_groq_client)
):
    """Perform gap analysis between standards"""
    comparison_service = ComparisonService(db, groq_client, None)
    try:
        gaps = await comparison_service.gap_analysis(
            base_standard=standard,
            compare_standards=compare_with
        )
        return {"base_standard": standard, "compared_with": compare_with, "gaps": gaps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")
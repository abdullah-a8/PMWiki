from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.citations import CitationRequest, CitationResponse, BibliographyExportRequest
from app.services.citations import CitationService
from app.dependencies import get_db, get_groq_client, get_qdrant_client
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/query-with-citations", response_model=CitationResponse)
async def query_with_citations(
    request: CitationRequest,
    db: Session = Depends(get_db),
    groq_client=Depends(get_groq_client),
    qdrant_client=Depends(get_qdrant_client)
):
    """Main RAG endpoint that returns answers with academic citations"""
    citation_service = CitationService(db, groq_client, qdrant_client)
    try:
        response = await citation_service.generate_citation_response(
            query=request.query,
            citation_style=request.citation_style,
            max_sources=request.max_sources
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Citation query failed: {str(e)}")


@router.get("/citation/{standard}/{section_id}")
async def get_citation_details(
    standard: str,
    section_id: str,
    citation_style: str = "APA",
    db: Session = Depends(get_db)
):
    """Get detailed citation information for a specific section"""
    citation_service = CitationService(db, None, None)
    try:
        citation = await citation_service.get_section_citation(
            standard=standard,
            section_id=section_id,
            style=citation_style
        )
        return {"citation": citation, "standard": standard, "section_id": section_id}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Citation not found: {str(e)}")


@router.post("/export-citations")
async def export_bibliography(
    request: BibliographyExportRequest,
    db: Session = Depends(get_db)
):
    """Export bibliography in various formats (APA, MLA, IEEE, BibTeX)"""
    citation_service = CitationService(db, None, None)
    try:
        bibliography = await citation_service.export_bibliography(
            section_ids=request.section_ids,
            format=request.format,
            style=request.style
        )
        return {"bibliography": bibliography, "format": request.format}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bibliography export failed: {str(e)}")


@router.get("/section-relationships/{section_id}")
async def get_section_relationships(
    section_id: str,
    db: Session = Depends(get_db),
    qdrant_client=Depends(get_qdrant_client)
):
    """Get related sections based on semantic similarity"""
    citation_service = CitationService(db, None, qdrant_client)
    try:
        relationships = await citation_service.find_related_sections(
            section_id=section_id,
            limit=10
        )
        return {"section_id": section_id, "related_sections": relationships}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Relationship query failed: {str(e)}")
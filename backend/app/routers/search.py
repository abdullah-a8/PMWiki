from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.schemas.search import SearchRequest, SearchResponse
from app.services.search import SearchService
from app.dependencies import get_qdrant_client, get_voyage_client

router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def semantic_search(
    request: SearchRequest,
    qdrant_client=Depends(get_qdrant_client),
    voyage_client=Depends(get_voyage_client)
):
    """Perform semantic search across all standards"""
    search_service = SearchService(qdrant_client, voyage_client)
    try:
        results = await search_service.semantic_search(
            query=request.query,
            standards=request.standards,
            limit=request.limit,
            min_score=request.min_score
        )
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/search/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Search query prefix"),
    limit: int = Query(5, ge=1, le=10, description="Number of suggestions")
):
    """Get search suggestions based on query prefix"""
    # TODO: Implement search suggestions logic
    return {"suggestions": [f"{q} suggestion {i}" for i in range(1, limit + 1)]}


@router.post("/search/within-standard")
async def search_within_standard(
    standard: str,
    query: str,
    limit: int = Query(10, ge=1, le=50),
    qdrant_client=Depends(get_qdrant_client),
    voyage_client=Depends(get_voyage_client)
):
    """Search within a specific standard (PMBOK, PRINCE2, or ISO21502)"""
    search_service = SearchService(qdrant_client, voyage_client)
    try:
        results = await search_service.search_within_standard(
            query=query,
            standard=standard,
            limit=limit
        )
        return {"results": results, "standard": standard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Standard search failed: {str(e)}")
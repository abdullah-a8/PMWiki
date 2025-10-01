"""
Search endpoints router
Handles cross-standard semantic search with RAG and section retrieval
"""
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchWithinStandardRequest,
    SearchWithinStandardResponse
)
from app.schemas.section import SectionResponse, SectionListResponse, SectionListItem
from app.services.rag_service import get_rag_service
from app.services.qdrant_service import get_qdrant_service
from app.services.voyage_service import get_voyage_service
from app.db.database import get_db
from app.models.document_section import CitationFormat

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Cross-standard semantic search",
    description="""
    Perform semantic search across PMBOK, PRINCE2, and ISO 21502 standards.

    Returns:
    - LLM-generated answer with inline citations
    - Primary sources (top chunk from each standard)
    - Additional context for further reading
    - Token usage statistics
    """,
    response_description="Search results with citations and sources"
)
async def semantic_search(
    request: SearchRequest,
    db: Session = Depends(get_db)
):
    """
    Perform citation-focused RAG search across all three standards.

    This endpoint:
    1. Embeds the query using Voyage AI
    2. Searches Qdrant for relevant chunks from each standard
    3. Generates a synthesized answer using Groq LLM
    4. Returns answer with citations + source references
    """
    try:
        logger.info(f"Search request received: '{request.query}'")

        # Get RAG service
        rag_service = get_rag_service()

        # Perform RAG query
        result = rag_service.query_with_citations(
            query=request.query,
            db_session=db,
            top_k_per_standard=request.top_k_per_standard,
            score_threshold=request.score_threshold
        )

        logger.info(f"Search completed successfully for query: '{request.query}'")
        return result

    except ValueError as e:
        logger.error(f"Validation error in search: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Search failed for query '{request.query}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search operation failed. Please try again later."
        )


@router.get(
    "/sections/{section_id}",
    response_model=SectionResponse,
    summary="Get specific section by ID",
    description="""
    Retrieve a specific document section by its UUID.

    Returns:
    - Complete section details including content
    - Multiple citation formats (APA, IEEE)
    - Hierarchical context (parent chain)
    - Metadata flags
    """,
    response_description="Complete section details"
)
async def get_section(
    section_id: str = Path(..., description="Section UUID"),
    db: Session = Depends(get_db)
):
    """
    Get a specific document section by ID.

    This endpoint allows deep-linking to exact sections referenced in search results.
    """
    try:
        logger.info(f"Fetching section: {section_id}")

        # Query database for section
        query = text("""
            SELECT
                id::text,
                standard::text,
                section_number,
                section_title,
                level,
                page_start,
                page_end,
                content_cleaned as content,
                citation_key,
                parent_chain,
                child_count,
                content_flags,
                created_at
            FROM document_sections
            WHERE id::text = :section_id
        """)

        result = db.execute(query, {"section_id": section_id}).fetchone()

        if not result:
            logger.warning(f"Section not found: {section_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Section with ID '{section_id}' not found"
            )

        # Convert to dict
        section = dict(result._mapping)

        # Generate citations
        year_map = {
            'PMBOK': '2021',
            'PRINCE2': '2017',
            'ISO_21502': '2020'
        }
        year = year_map.get(section['standard'], '2021')

        # APA citation
        page_ref = f"p. {section['page_start']}"
        if section['page_end'] and section['page_end'] != section['page_start']:
            page_ref = f"pp. {section['page_start']}-{section['page_end']}"

        section['citation_apa'] = (
            f"{section['standard']} ({year}), "
            f"Section {section['section_number']}, "
            f"{page_ref}"
        )

        # IEEE citation
        section['citation_ieee'] = (
            f"{section['standard']}, "
            f"\"{section['section_title']},\" "
            f"sec. {section['section_number']}, "
            f"p. {section['page_start']}, "
            f"{year}."
        )

        logger.info(f"Section retrieved successfully: {section_id}")
        return section

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch section {section_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve section. Please try again later."
        )


@router.get(
    "/standards/{standard}/sections",
    response_model=SectionListResponse,
    summary="List all sections within a standard",
    description="""
    Get a list of all sections for a specific standard (PMBOK, PRINCE2, or ISO_21502).

    Returns:
    - Lightweight section information (no full content)
    - Sorted by section number
    - Total count of sections
    - Useful for navigation and table of contents
    """,
    response_description="List of sections within the standard"
)
async def list_standard_sections(
    standard: str = Path(..., description="Standard name (PMBOK, PRINCE2, ISO_21502)"),
    db: Session = Depends(get_db)
):
    """
    List all sections within a specific standard.

    This endpoint provides a table of contents view for navigating standards.
    """
    try:
        # Normalize standard name (handle URL-encoded spaces)
        standard = standard.replace(" ", "_").replace("%20", "_")

        # Validate standard name
        valid_standards = ["PMBOK", "PRINCE2", "ISO_21502"]
        if standard not in valid_standards:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid standard. Must be one of: {', '.join(valid_standards)}"
            )

        logger.info(f"Listing sections for standard: {standard}")

        # Query database for all sections in the standard
        query = text("""
            SELECT
                id::text,
                section_number,
                section_title,
                level,
                page_start,
                citation_key
            FROM document_sections
            WHERE standard::text = :standard
            ORDER BY
                -- Handle both numeric sections (7.2.3) and text sections (Annex A)
                page_start,
                section_number
        """)

        results = db.execute(query, {"standard": standard}).fetchall()

        # Convert to list of dicts
        sections = [
            {
                "id": row[0],
                "section_number": row[1],
                "section_title": row[2],
                "level": row[3],
                "page_start": row[4],
                "citation_key": row[5]
            }
            for row in results
        ]

        logger.info(f"Found {len(sections)} sections for {standard}")

        return {
            "standard": standard,
            "total_sections": len(sections),
            "sections": sections
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list sections for standard {standard}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sections. Please try again later."
        )


@router.post(
    "/search-within-standard",
    response_model=SearchWithinStandardResponse,
    summary="Search within a specific standard",
    description="""
    Perform semantic search within a single standard (PMBOK, PRINCE2, or ISO_21502).

    Returns:
    - Ranked search results from the specified standard only
    - No LLM synthesis (raw vector search results)
    - Useful for focused standard exploration
    """,
    response_description="Ranked search results from the standard"
)
async def search_within_standard(
    request: SearchWithinStandardRequest,
    db: Session = Depends(get_db)
):
    """
    Search within a specific standard without cross-standard comparison.

    This endpoint is optimized for exploring a single standard in depth,
    returning more results than the cross-standard search.
    """
    try:
        logger.info(f"Standard-specific search: '{request.query}' in {request.standard}")

        # Get services
        voyage_service = get_voyage_service()
        qdrant_service = get_qdrant_service()

        # Generate query embedding
        query_embedding = voyage_service.embed_query(request.query)

        # Search within specific standard
        search_results = qdrant_service.search_by_standard(
            query_vector=query_embedding,
            standard=request.standard.value,
            limit=request.limit,
            score_threshold=request.score_threshold
        )

        if not search_results:
            logger.info(f"No results found for query '{request.query}' in {request.standard}")
            return {
                "standard": request.standard.value,
                "query": request.query,
                "results": [],
                "total_results": 0
            }

        # Extract IDs and scores
        chunk_ids = [str(result['id']) for result in search_results]
        scores = {str(result['id']): result['score'] for result in search_results}

        # Fetch full metadata from database
        query = text("""
            SELECT
                id::text,
                standard::text,
                section_number,
                section_title,
                page_start,
                page_end,
                content_cleaned as content,
                citation_key
            FROM document_sections
            WHERE id::text = ANY(:ids)
            ORDER BY array_position(:ids, id::text)
        """)

        rows = db.execute(query, {"ids": chunk_ids}).fetchall()

        # Format results with citations
        year_map = {
            'PMBOK': '2021',
            'PRINCE2': '2017',
            'ISO_21502': '2020'
        }

        results = []
        for row in rows:
            section_id = row[0]
            standard = row[1]
            section_number = row[2]
            section_title = row[3]
            page_start = row[4]
            page_end = row[5]
            content = row[6]

            # Format citation
            year = year_map.get(standard, '2021')
            page_ref = f"p. {page_start}"
            if page_end and page_end != page_start:
                page_ref = f"pp. {page_start}-{page_end}"

            citation = f"{standard} ({year}), Section {section_number}, {page_ref}"

            results.append({
                "standard": standard,
                "section_number": section_number,
                "section_title": section_title,
                "page_start": page_start,
                "page_end": page_end,
                "content": content,
                "citation": citation,
                "relevance_score": scores.get(section_id, 0.0)
            })

        logger.info(f"Found {len(results)} results for '{request.query}' in {request.standard}")

        return {
            "standard": request.standard.value,
            "query": request.query,
            "results": results,
            "total_results": len(results)
        }

    except ValueError as e:
        logger.error(f"Validation error in standard search: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Standard search failed for '{request.query}' in {request.standard}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search operation failed. Please try again later."
        )
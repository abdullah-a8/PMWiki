"""
Process generation endpoints router
Handles tailored project process generation based on scenarios
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
import json

from app.schemas.process import (
    ProcessGenerationRequest,
    ProcessGenerationResponse
)
from app.services.rag_service import get_rag_service
from app.db.database import get_db

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/generate-process",
    response_model=ProcessGenerationResponse,
    summary="Generate tailored project process",
    description="""
    Generate a customized project management process based on specific scenario details.

    This endpoint:
    1. Analyzes project type, size, constraints, and priorities
    2. Retrieves relevant guidance from all three standards (PMBOK, PRINCE2, ISO 21502)
    3. Generates a tailored process with phases, activities, and deliverables
    4. Provides evidence-based recommendations with citations
    5. Explains tailoring rationale and standards alignment

    Returns:
    - Process overview and recommended phases
    - Specific recommendations for the scenario
    - Tailoring rationale explaining customizations
    - Standards alignment showing how process draws from each standard
    - Token usage statistics

    Example scenarios:
    - "Software development project with tight deadline and quality focus"
    - "Construction project with regulatory compliance requirements"
    - "Organizational change initiative with stakeholder management emphasis"
    """,
    response_description="Tailored process with phases, recommendations, and citations"
)
async def generate_process(
    request: ProcessGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a tailored project process for a specific scenario.

    This endpoint performs intelligent RAG-based process generation:
    1. Searches for relevant content based on project type, focus areas, and priorities
    2. Retrieves top 15 most relevant sections across all standards
    3. Uses LLM to synthesize a tailored process with citations
    4. Returns structured process with phases, recommendations, and justifications
    """
    try:
        logger.info(f"Process generation request: {request.project_type} ({request.project_size})")

        # Get RAG service
        rag_service = get_rag_service()

        # Generate process
        result = rag_service.generate_process(
            project_description=request.project_description,
            project_type=request.project_type.value,
            project_size=request.project_size.value,
            constraints=request.constraints,
            priorities=request.priorities,
            focus_areas=request.focus_areas,
            db_session=db,
            top_k=5  # Top 5 sections per search query
        )

        # Parse LLM JSON response (strip markdown code blocks if present)
        try:
            raw_response = result['process_data']

            # Strip markdown code blocks if present
            if raw_response.startswith('```json'):
                raw_response = raw_response[7:]  # Remove ```json
            elif raw_response.startswith('```'):
                raw_response = raw_response[3:]  # Remove ```

            if raw_response.endswith('```'):
                raw_response = raw_response[:-3]  # Remove trailing ```

            raw_response = raw_response.strip()

            process_data = json.loads(raw_response)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON response: {e}")
            logger.error(f"Raw response: {result['process_data'][:500]}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to parse process generation response. Please try again."
            )

        # Structure final response
        response = {
            'project_type': result['project_type'],
            'overview': process_data.get('overview', ''),
            'phases': process_data.get('phases', []),
            'key_recommendations': process_data.get('key_recommendations', []),
            'tailoring_rationale': process_data.get('tailoring_rationale', ''),
            'standards_alignment': process_data.get('standards_alignment', {}),
            'mermaid_diagram': process_data.get('mermaid_diagram'),
            'usage_stats': result['usage_stats']
        }

        # Log mermaid diagram status
        if response.get('mermaid_diagram'):
            logger.info(f"Mermaid diagram generated: {len(response['mermaid_diagram'])} characters")
        else:
            logger.warning("No mermaid diagram in LLM response")

        logger.info(f"Process generated successfully: {len(response['phases'])} phases, {len(response['key_recommendations'])} recommendations")
        return response

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error in process generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Process generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Process generation failed. Please try again later."
        )

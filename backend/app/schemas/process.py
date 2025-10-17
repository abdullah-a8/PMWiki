"""
Process generation schemas
"""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from enum import Enum


class ProjectTypeEnum(str, Enum):
    """Common project types"""
    SOFTWARE_DEVELOPMENT = "software_development"
    CONSTRUCTION = "construction"
    CONSULTING = "consulting"
    RESEARCH = "research"
    PRODUCT_DEVELOPMENT = "product_development"
    ORGANIZATIONAL_CHANGE = "organizational_change"
    EVENT_MANAGEMENT = "event_management"
    INFRASTRUCTURE = "infrastructure"
    OTHER = "other"


class ProjectSizeEnum(str, Enum):
    """Project size categories"""
    SMALL = "small"  # < 6 months, < 5 people
    MEDIUM = "medium"  # 6-12 months, 5-20 people
    LARGE = "large"  # > 12 months, > 20 people


class ProcessGenerationRequest(BaseModel):
    """Request for generating a tailored project process"""
    project_type: ProjectTypeEnum = Field(
        ...,
        description="Type of project"
    )
    project_description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Brief description of the project and its goals"
    )
    project_size: ProjectSizeEnum = Field(
        default=ProjectSizeEnum.MEDIUM,
        description="Size/scale of the project"
    )
    constraints: Optional[List[str]] = Field(
        default=None,
        max_length=10,
        description="Key constraints (e.g., 'tight budget', 'fixed deadline', 'regulatory compliance')"
    )
    priorities: Optional[List[str]] = Field(
        default=None,
        max_length=10,
        description="Key priorities (e.g., 'quality', 'speed', 'stakeholder satisfaction')"
    )
    focus_areas: Optional[List[str]] = Field(
        default=None,
        max_length=5,
        description="Specific areas to emphasize (e.g., 'risk management', 'change control', 'quality assurance')"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "project_type": "software_development",
                    "project_description": "Developing a mobile app for real-time project tracking with integration to existing enterprise systems",
                    "project_size": "medium",
                    "constraints": ["tight deadline", "limited budget", "must integrate with legacy systems"],
                    "priorities": ["quality", "user experience", "security"],
                    "focus_areas": ["risk management", "stakeholder engagement"]
                }
            ]
        }
    }


class ProcessPhase(BaseModel):
    """A phase in the generated process"""
    phase_name: str = Field(..., description="Name of the phase")
    description: str = Field(..., description="What this phase accomplishes")
    key_activities: List[str] = Field(..., description="Main activities in this phase")
    deliverables: List[str] = Field(..., description="Expected outputs from this phase")
    duration_guidance: Optional[str] = Field(None, description="Suggested duration or timing")


class ProcessRecommendation(BaseModel):
    """A specific recommendation with justification"""
    area: str = Field(..., description="Area this recommendation applies to (e.g., 'Risk Management', 'Quality Control')")
    recommendation: str = Field(..., description="The specific recommendation")
    justification: str = Field(..., description="Why this is recommended for this project")
    source_standards: List[str] = Field(..., description="Which standards support this (e.g., ['PMBOK', 'ISO_21502'])")
    citations: List[str] = Field(..., description="Specific citations from standards")


class ProcessGenerationResponse(BaseModel):
    """Response containing the tailored process"""
    project_type: str = Field(..., description="Type of project this process is designed for")
    overview: str = Field(..., description="High-level overview of the recommended approach")
    phases: List[ProcessPhase] = Field(..., description="Recommended phases for this project")
    key_recommendations: List[ProcessRecommendation] = Field(
        ...,
        description="Specific recommendations tailored to this project"
    )
    tailoring_rationale: str = Field(
        ...,
        description="Explanation of how/why the process was tailored to this specific project"
    )
    standards_alignment: Dict[str, str] = Field(
        ...,
        description="How this process aligns with each standard (PMBOK, PRINCE2, ISO_21502)"
    )
    mermaid_diagram: Optional[str] = Field(
        None,
        description="Mermaid.js flowchart syntax representing the complete process flow with decision gates"
    )
    usage_stats: dict = Field(..., description="LLM token usage statistics")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "project_type": "software_development",
                    "overview": "This process emphasizes iterative development with strong risk management...",
                    "phases": [
                        {
                            "phase_name": "Initiation & Planning",
                            "description": "Define project scope, objectives, and detailed plans",
                            "key_activities": ["Stakeholder identification", "Risk assessment", "Resource planning"],
                            "deliverables": ["Project charter", "Risk register", "Resource plan"],
                            "duration_guidance": "10-15% of total timeline"
                        }
                    ],
                    "key_recommendations": [
                        {
                            "area": "Risk Management",
                            "recommendation": "Implement weekly risk reviews due to integration complexity",
                            "justification": "Legacy system integration introduces significant technical risks",
                            "source_standards": ["PMBOK", "ISO_21502"],
                            "citations": ["PMBOK (2021), Section 11.2, pp. 456-458"]
                        }
                    ],
                    "tailoring_rationale": "Process emphasizes integration testing and change control due to legacy system constraints...",
                    "standards_alignment": {
                        "PMBOK": "Aligns with PMBOK's emphasis on risk management and stakeholder engagement",
                        "PRINCE2": "Adopts PRINCE2's stage-based approach for better control points",
                        "ISO_21502": "Follows ISO 21502's guidance on quality management throughout lifecycle"
                    },
                    "usage_stats": {
                        "model": "llama-3.3-70b-versatile",
                        "tokens": {"prompt_tokens": 1500, "completion_tokens": 2000, "total_tokens": 3500}
                    }
                }
            ]
        }
    }

"""
Pydantic schemas for comparison endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Dict


class ComparisonRequest(BaseModel):
    """Request schema for topic-based comparison across standards"""
    topic: str = Field(
        ...,
        min_length=3,
        max_length=200,
        description="Topic to compare across standards",
        examples=["Risk Management", "Stakeholder Engagement"]
    )
    top_k_per_standard: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Number of sections to retrieve per standard for comparison"
    )
    score_threshold: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score threshold"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "topic": "Risk Management",
                    "top_k_per_standard": 2,
                    "score_threshold": 0.4
                }
            ]
        }
    }


class SourceSummary(BaseModel):
    """Lightweight source reference for comparison"""
    id: str = Field(..., description="Section UUID")
    section_number: str = Field(..., description="Section identifier")
    section_title: str = Field(..., description="Section title")
    page_start: int = Field(..., description="Starting page number")
    page_end: int | None = Field(None, description="Ending page number")
    citation: str = Field(..., description="Formatted citation")
    relevance_score: float = Field(..., description="Relevance score")
    content_preview: str = Field(..., description="Short content preview")


class ComparisonResponse(BaseModel):
    """Response schema for topic-based comparison"""
    topic: str = Field(..., description="Topic compared")
    comparison: str = Field(..., description="LLM-generated comparison analysis with similarities, differences, and unique elements")
    sources: Dict[str, List[SourceSummary]] = Field(
        ...,
        description="Source references grouped by standard (PMBOK, PRINCE2, ISO_21502)"
    )
    usage_stats: dict = Field(..., description="Token usage statistics")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "topic": "Risk Management",
                    "comparison": "### Overview\nRisk management is addressed by all three standards...\n\n### Similarities\n- All emphasize proactive identification...\n\n### Differences\n- PMBOK focuses on quantitative analysis...\n\n### Unique Points\n- ISO 21502 uniquely covers...",
                    "sources": {
                        "PMBOK": [
                            {
                                "section_number": "2.8.5",
                                "section_title": "Risk",
                                "page_start": 122,
                                "page_end": None,
                                "citation": "PMBOK (2021), Section 2.8.5, p. 122",
                                "relevance_score": 0.71,
                                "content_preview": "Risk is an uncertain event or condition..."
                            }
                        ],
                        "PRINCE2": [],
                        "ISO_21502": []
                    },
                    "usage_stats": {
                        "model": "llama-3.3-70b-versatile",
                        "tokens": {
                            "prompt_tokens": 1800,
                            "completion_tokens": 650,
                            "total_tokens": 2450
                        }
                    }
                }
            ]
        }
    }


class SectionComparisonRequest(BaseModel):
    """Request schema for direct section-to-section comparison"""
    section_ids: List[str] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="List of section UUIDs to compare (2-3 sections)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "section_ids": [
                        "550e8400-e29b-41d4-a716-446655440000",
                        "660e8400-e29b-41d4-a716-446655440001"
                    ]
                }
            ]
        }
    }


class SectionDetail(BaseModel):
    """Detailed section information for comparison"""
    id: str
    standard: str
    section_number: str
    section_title: str
    page_start: int
    page_end: int | None
    content: str
    citation: str


class SectionComparisonResponse(BaseModel):
    """Response schema for direct section comparison"""
    sections: List[SectionDetail] = Field(..., description="Sections being compared")
    analysis: str = Field(..., description="LLM-generated comparative analysis")
    usage_stats: dict = Field(..., description="Token usage statistics")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "sections": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "standard": "PMBOK",
                            "section_number": "2.8.5",
                            "section_title": "Risk",
                            "page_start": 122,
                            "page_end": None,
                            "content": "Risk is an uncertain event...",
                            "citation": "PMBOK (2021), Section 2.8.5, p. 122"
                        }
                    ],
                    "analysis": "Comparing these sections reveals...",
                    "usage_stats": {
                        "model": "llama-3.3-70b-versatile",
                        "tokens": {
                            "prompt_tokens": 1200,
                            "completion_tokens": 400,
                            "total_tokens": 1600
                        }
                    }
                }
            ]
        }
    }


class SimilarSectionsRequest(BaseModel):
    """Request schema for finding similar sections"""
    section_id: str = Field(..., description="Section UUID to find similarities for")
    limit: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Maximum number of similar sections to return"
    )
    score_threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score"
    )
    include_same_standard: bool = Field(
        default=False,
        description="Include sections from the same standard in results"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "section_id": "550e8400-e29b-41d4-a716-446655440000",
                    "limit": 10,
                    "score_threshold": 0.5,
                    "include_same_standard": False
                }
            ]
        }
    }


class SimilarSection(BaseModel):
    """Similar section reference"""
    id: str
    standard: str
    section_number: str
    section_title: str
    page_start: int
    citation: str
    similarity_score: float
    content_preview: str


class SimilarSectionsResponse(BaseModel):
    """Response schema for similar sections"""
    source_section: SectionDetail = Field(..., description="Original section")
    similar_sections: List[SimilarSection] = Field(..., description="Similar sections across standards")
    total_found: int = Field(..., description="Total number of similar sections found")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "source_section": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "standard": "PMBOK",
                        "section_number": "2.8.5",
                        "section_title": "Risk",
                        "page_start": 122,
                        "page_end": None,
                        "content": "Risk is an uncertain event...",
                        "citation": "PMBOK (2021), Section 2.8.5, p. 122"
                    },
                    "similar_sections": [
                        {
                            "id": "660e8400-e29b-41d4-a716-446655440001",
                            "standard": "PRINCE2",
                            "section_number": "8.4",
                            "section_title": "Risk Management",
                            "page_start": 58,
                            "citation": "PRINCE2 (2017), Section 8.4, p. 58",
                            "similarity_score": 0.72,
                            "content_preview": "The management of risk is one of the most important..."
                        }
                    ],
                    "total_found": 5
                }
            ]
        }
    }
"""
Pydantic schemas for search endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class StandardEnum(str, Enum):
    """Valid standard names"""
    PMBOK = "PMBOK"
    PRINCE2 = "PRINCE2"
    ISO_21502 = "ISO_21502"


class SearchRequest(BaseModel):
    """Request schema for cross-standard semantic search"""
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Search query text",
        examples=["What is risk management?"]
    )
    top_k_per_standard: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of results to return per standard"
    )
    score_threshold: float = Field(
        default=0.4,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score (0-1)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "What is risk management in project management?",
                    "top_k_per_standard": 3,
                    "score_threshold": 0.4
                }
            ]
        }
    }


class SourceReference(BaseModel):
    """Schema for a source reference with citation"""
    standard: str = Field(..., description="Standard name (PMBOK, PRINCE2, ISO_21502)")
    section_number: str = Field(..., description="Section identifier")
    section_title: str = Field(..., description="Section title")
    page_start: int = Field(..., description="Starting page number")
    page_end: Optional[int] = Field(None, description="Ending page number")
    content: str = Field(..., description="Section content")
    citation: str = Field(..., description="Formatted citation (APA style)")
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")


class UsageStats(BaseModel):
    """Token usage and processing statistics"""
    model: str = Field(..., description="LLM model used")
    tokens: dict = Field(..., description="Token usage breakdown")
    chunks_retrieved: int = Field(..., description="Total chunks retrieved")
    primary_sources_count: int = Field(..., description="Number of primary sources")
    additional_sources_count: int = Field(..., description="Number of additional sources")


class SearchResponse(BaseModel):
    """Response schema for cross-standard semantic search with citations"""
    query: str = Field(..., description="Original search query")
    answer: str = Field(..., description="LLM-generated answer with citations")
    primary_sources: List[SourceReference] = Field(
        ...,
        description="Top chunk from each standard (main references)"
    )
    additional_context: List[SourceReference] = Field(
        ...,
        description="Additional relevant chunks for further reading"
    )
    usage_stats: UsageStats = Field(..., description="Processing statistics")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "What is risk management?",
                    "answer": "Risk management is a critical aspect...",
                    "primary_sources": [
                        {
                            "standard": "PMBOK",
                            "section_number": "2.8.5",
                            "section_title": "Risk",
                            "page_start": 122,
                            "page_end": None,
                            "content": "Risk is an uncertain event...",
                            "citation": "PMBOK (2021), Section 2.8.5, p. 122",
                            "relevance_score": 0.71
                        }
                    ],
                    "additional_context": [],
                    "usage_stats": {
                        "model": "llama-3.3-70b-versatile",
                        "tokens": {
                            "prompt_tokens": 2364,
                            "completion_tokens": 770,
                            "total_tokens": 3134
                        },
                        "chunks_retrieved": 9,
                        "primary_sources_count": 3,
                        "additional_sources_count": 6
                    }
                }
            ]
        }
    }


class SearchWithinStandardRequest(BaseModel):
    """Request schema for searching within a specific standard"""
    standard: StandardEnum = Field(
        ...,
        description="Standard to search within (PMBOK, PRINCE2, ISO_21502)"
    )
    query: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="Search query text",
        examples=["What is risk management?"]
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum number of results to return"
    )
    score_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score (0-1)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "standard": "PMBOK",
                    "query": "risk management",
                    "limit": 10,
                    "score_threshold": 0.3
                }
            ]
        }
    }


class SearchWithinStandardResponse(BaseModel):
    """Response schema for standard-specific search"""
    standard: str = Field(..., description="Standard searched")
    query: str = Field(..., description="Search query")
    results: List[SourceReference] = Field(..., description="Search results")
    total_results: int = Field(..., description="Number of results returned")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "standard": "PMBOK",
                    "query": "risk management",
                    "results": [
                        {
                            "standard": "PMBOK",
                            "section_number": "2.8.5",
                            "section_title": "Risk",
                            "page_start": 122,
                            "page_end": None,
                            "content": "Risk is an uncertain event...",
                            "citation": "PMBOK (2021), Section 2.8.5, p. 122",
                            "relevance_score": 0.71
                        }
                    ],
                    "total_results": 10
                }
            ]
        }
    }

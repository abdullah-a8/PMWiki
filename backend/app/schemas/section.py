"""
Pydantic schemas for section retrieval endpoints
"""
from pydantic import BaseModel, Field, UUID4
from typing import Optional, List
from datetime import datetime


class SectionResponse(BaseModel):
    """Response schema for a single document section"""
    id: str = Field(..., description="Section UUID")
    standard: str = Field(..., description="Standard name (PMBOK, PRINCE2, ISO_21502)")
    section_number: str = Field(..., description="Section identifier (e.g., '2.8.5')")
    section_title: str = Field(..., description="Section title")
    level: int = Field(..., ge=0, le=5, description="Hierarchical depth level")
    page_start: Optional[int] = Field(None, description="Starting page number")
    page_end: Optional[int] = Field(None, description="Ending page number")
    content: str = Field(..., description="Section content")
    citation_key: str = Field(..., description="Unique citation identifier")
    citation_apa: str = Field(..., description="APA formatted citation")
    citation_ieee: str = Field(..., description="IEEE formatted citation")
    parent_chain: list = Field(default_factory=list, description="Hierarchical parent chain")
    child_count: Optional[int] = Field(0, description="Number of child sections")
    content_flags: dict = Field(default_factory=dict, description="Content metadata flags")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "standard": "PMBOK",
                    "section_number": "2.8.5",
                    "section_title": "Risk",
                    "level": 2,
                    "page_start": 122,
                    "page_end": None,
                    "content": "Risk is an uncertain event or condition...",
                    "citation_key": "PMBOK_2.8.5_122",
                    "citation_apa": "PMBOK (2021), Section 2.8.5, p. 122",
                    "citation_ieee": "PMBOK, \"Risk,\" sec. 2.8.5, p. 122, 2021.",
                    "parent_chain": [],
                    "child_count": 0,
                    "content_flags": {"has_figures": False, "has_tables": False},
                    "created_at": "2025-09-30T00:00:00Z"
                }
            ]
        }
    }


class SectionListItem(BaseModel):
    """Lightweight schema for listing sections"""
    id: str = Field(..., description="Section UUID")
    section_number: str = Field(..., description="Section identifier")
    section_title: str = Field(..., description="Section title")
    level: int = Field(..., description="Hierarchical level")
    page_start: Optional[int] = Field(None, description="Starting page number")
    citation_key: str = Field(..., description="Citation identifier")


class SectionListResponse(BaseModel):
    """Response schema for listing sections within a standard"""
    standard: str = Field(..., description="Standard name")
    total_sections: int = Field(..., description="Total number of sections")
    sections: List[SectionListItem] = Field(..., description="List of sections")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "standard": "PMBOK",
                    "total_sections": 131,
                    "sections": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "section_number": "1.1",
                            "section_title": "Overview",
                            "level": 1,
                            "page_start": 10,
                            "citation_key": "PMBOK_1.1_10"
                        }
                    ]
                }
            ]
        }
    }
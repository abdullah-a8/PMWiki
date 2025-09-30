from sqlalchemy import String, Integer, Text, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
import uuid
import enum

from app.db.database import Base


# Python Enums matching database ENUM types
class StandardType(str, enum.Enum):
    PMBOK = "PMBOK"
    PRINCE2 = "PRINCE2"
    ISO_21502 = "ISO_21502"


class CitationFormat(str, enum.Enum):
    APA = "APA"
    MLA = "MLA"
    IEEE = "IEEE"
    CHICAGO = "CHICAGO"


class DocumentSection(Base):
    """
    SQLAlchemy model for document_sections table.

    This model matches your existing schema.sql structure exactly,
    supporting citation-focused RAG for PMBOK, PRINCE2, and ISO 21502.
    """
    __tablename__ = "document_sections"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="uuid_generate_v4()"
    )

    # Core citation metadata
    standard: Mapped[StandardType] = mapped_column(
        SQLEnum(StandardType, name="standard_type"),
        nullable=False,
        comment="Standard type: PMBOK, PRINCE2, or ISO_21502"
    )

    section_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Section identifier like '1.2', '4.3.1'"
    )

    section_title: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Human-readable section title"
    )

    level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Hierarchical depth level (0-5)"
    )

    # Page references for academic citations
    page_start: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Starting page number for citation"
    )

    page_end: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Ending page number if span multiple pages"
    )

    # Content fields (3 versions as per schema)
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Primary content field"
    )

    content_cleaned: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Cleaned text for search and processing"
    )

    content_original: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Original unprocessed text"
    )

    # Note: word_count is a GENERATED column in the database, not mapped here

    # Hierarchical relationships
    parent_section_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Parent section foreign key"
    )

    parent_chain: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default="'[]'::jsonb",
        comment="Full hierarchical context chain"
    )

    child_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        server_default="0",
        comment="Number of child sections"
    )

    # Content metadata
    content_flags: Mapped[dict] = mapped_column(
        JSONB,
        nullable=True,
        server_default="'{}'::jsonb",
        comment="Content analysis flags (figures, tables, etc.)"
    )

    # Note: has_figures, has_tables, has_bullet_points are GENERATED columns

    # Embedding and search (pgvector)
    # Note: embedding is stored as vector(1024) type - handled by raw SQL or custom type
    # We'll handle this separately for vector operations

    embedding_model: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        server_default="'voyage-3-large'",
        comment="Embedding model used"
    )

    embedding_created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        comment="When embedding was generated"
    )

    # Citation metadata
    citation_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        comment="Unique citation identifier"
    )

    # Audit fields
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default="NOW()",
        comment="Record creation timestamp"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default="NOW()",
        comment="Record last update timestamp"
    )

    def __repr__(self) -> str:
        return (
            f"DocumentSection(id={self.id!r}, "
            f"standard={self.standard.value!r}, "
            f"section={self.section_number!r}, "
            f"title='{self.section_title[:30]}...')"
        )

    def get_citation(self, format: CitationFormat = CitationFormat.APA) -> str:
        """
        Generate academic citation for this section.

        Args:
            format: Citation format (APA, MLA, IEEE, CHICAGO)

        Returns:
            str: Formatted citation string
        """
        if format == CitationFormat.APA:
            page_ref = f"p. {self.page_start}"
            if self.page_end and self.page_end != self.page_start:
                page_ref = f"pp. {self.page_start}-{self.page_end}"

            year = self.get_publication_year()
            return (
                f"{self.standard.value} ({year}). "
                f"Section {self.section_number}: {self.section_title}. "
                f"{page_ref}."
            )

        elif format == CitationFormat.IEEE:
            return (
                f"{self.standard.value}, "
                f"\"{self.section_title},\" "
                f"sec. {self.section_number}, "
                f"p. {self.page_start}, "
                f"{self.get_publication_year()}."
            )

        # Default fallback
        return f"{self.standard.value} Section {self.section_number}, Page {self.page_start}"

    def get_publication_year(self) -> str:
        """Get publication year based on standard."""
        year_mapping = {
            StandardType.PMBOK: "2021",  # PMBOK 7th Edition
            StandardType.PRINCE2: "2017",  # PRINCE2 2017 Edition
            StandardType.ISO_21502: "2020"  # ISO 21502:2020
        }
        return year_mapping.get(self.standard, "2021")

    @property
    def word_count(self) -> int:
        """Calculate word count from content_cleaned (matches DB generated column)."""
        return len(self.content_cleaned.strip().split()) if self.content_cleaned else 0

    @property
    def has_embedding(self) -> bool:
        """Check if this section has an embedding vector."""
        return self.embedding_created_at is not None

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "standard": self.standard.value,
            "section_number": self.section_number,
            "section_title": self.section_title,
            "level": self.level,
            "page_start": self.page_start,
            "page_end": self.page_end,
            "content": self.content,
            "citation_key": self.citation_key,
            "parent_chain": self.parent_chain,
            "content_flags": self.content_flags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
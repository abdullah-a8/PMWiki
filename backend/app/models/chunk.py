from sqlalchemy import String, Integer, Text, Boolean, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.db.database import Base


class Chunk(Base):
    """
    SQLAlchemy model for document chunks with citation metadata.

    Based on the structure of your PMBOK, PRINCE2, and ISO 21502 chunks,
    this model supports academic citation requirements with exact section
    and page references.
    """
    __tablename__ = "chunks"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    # Citation metadata - core fields from your JSON structure
    standard: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Standard type: PMBOK, PRINCE2, or ISO_21502"
    )

    section_number: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Section identifier like '1.2', '4.3.1'"
    )

    section_title: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="Human-readable section title"
    )

    level: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Hierarchical depth level (0-4)"
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

    # Content fields
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Clean processed text content"
    )

    text_original: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Original unprocessed text"
    )

    # Hierarchical relationship data
    parent_chain: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String),
        nullable=True,
        comment="Full hierarchical context chain"
    )

    # Content processing metadata
    cleaning_applied: Mapped[Optional[bool]] = mapped_column(
        Boolean,
        nullable=True,
        default=False,
        comment="Whether text cleaning was applied"
    )

    content_flags: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Content analysis flags (figures, tables, etc.)"
    )

    # Embedding and search optimization
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        ARRAY(String),  # Store as string array for now, will convert for vector ops
        nullable=True,
        comment="Vector embedding for semantic search"
    )

    # Citation and reference fields
    citation_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        comment="Unique citation identifier"
    )

    # Metadata and tracking
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        comment="Record creation timestamp"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Record last update timestamp"
    )

    def __repr__(self) -> str:
        return (
            f"Chunk(id={self.id!r}, "
            f"standard={self.standard!r}, "
            f"section={self.section_number!r}, "
            f"title='{self.section_title[:30]}...' if len > 30)"
        )

    def get_citation(self, format: str = "apa") -> str:
        """
        Generate academic citation for this chunk.

        Args:
            format: Citation format ('apa', 'mla', 'ieee')

        Returns:
            str: Formatted citation string
        """
        if format.lower() == "apa":
            page_ref = f"p. {self.page_start}"
            if self.page_end and self.page_end != self.page_start:
                page_ref = f"pp. {self.page_start}-{self.page_end}"

            return (
                f"{self.standard} ({self.get_publication_year()}). "
                f"Section {self.section_number}: {self.section_title}. "
                f"{page_ref}."
            )

        # Add other citation formats as needed
        return f"{self.standard} Section {self.section_number}, Page {self.page_start}"

    def get_publication_year(self) -> str:
        """Get publication year based on standard."""
        year_mapping = {
            "PMBOK": "2021",  # PMBOK 7th Edition
            "PRINCE2": "2017",  # PRINCE2 2017 Edition
            "ISO_21502": "2020"  # ISO 21502:2020
        }
        return year_mapping.get(self.standard, "2021")

    @property
    def word_count(self) -> int:
        """Calculate word count of the text content."""
        return len(self.text.split()) if self.text else 0

    @property
    def has_embedding(self) -> bool:
        """Check if this chunk has an embedding vector."""
        return self.embedding is not None and len(self.embedding) > 0
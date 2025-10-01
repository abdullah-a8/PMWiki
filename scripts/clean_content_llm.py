#!/usr/bin/env python3
"""
LLM-Based Content Cleaning Migration Script
Uses Groq (free tier) to intelligently clean and reformat PDF-parsed content.

This script:
1. Fetches all document sections from PostgreSQL
2. Uses LLM to clean content (fix tables, remove artifacts, preserve meaning)
3. Updates content_cleaned field in database
4. Tracks progress and handles errors gracefully
5. Respects rate limits (30 req/min, 1000 req/day)

Usage:
    python scripts/clean_content_llm.py [--batch-size 5] [--delay 2.5] [--dry-run] [--standard PMBOK]
"""

import sys
import os
import time
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

# Load environment variables BEFORE importing backend modules
from dotenv import load_dotenv

# Load .env from project root
project_root = Path(__file__).parent.parent
env_path = project_root / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try backend/.env
    backend_env_path = project_root / "backend" / ".env"
    if backend_env_path.exists():
        load_dotenv(backend_env_path)
    else:
        print("⚠️  Warning: No .env file found. Make sure environment variables are set.")

# Add backend to path
backend_path = str(project_root / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from app.db.database import SessionLocal
    from app.models.document_section import DocumentSection, StandardType
except ImportError as e:
    print(f"❌ Import error: {e}")
    print(f"Make sure you're running from the project root directory")
    sys.exit(1)

from groq import Groq

# Initialize Groq client
groq_client = Groq()

# Cleaning prompt template
CLEANING_PROMPT = """You are a text formatting expert. Clean and reformat the following text that was extracted from a PDF.

INSTRUCTIONS:
1. Remove PDF artifacts: >, ===, ---, ++++, |, ^, etc.
2. Convert tables to readable format:
   - If you see table-like structures with | or > symbols, convert to clean bullet points or prose
   - Example: "> Building > Single delivery > Predictive" becomes "Building: Single delivery, Predictive approach"
3. Fix line breaks and spacing
4. Preserve ALL content and meaning - DO NOT summarize or omit information
5. Keep bullet points (•) and numbered lists
6. Keep section headers and important formatting
7. Make the text readable and professional

Return ONLY the cleaned text, no explanations.

TEXT TO CLEAN:
{content}

CLEANED TEXT:"""

BATCH_CLEANING_PROMPT = """You are a text formatting expert. Clean and reformat multiple text sections that were extracted from PDFs.

INSTRUCTIONS:
1. Remove PDF artifacts: >, ===, ---, ++++, |, ^, etc.
2. Convert tables to readable format (clean bullet points or prose)
3. Fix line breaks and spacing
4. Preserve ALL content and meaning
5. Keep bullet points and numbered lists
6. Return ONLY the cleaned texts in the SAME ORDER as input

I will provide sections in this format:
---SECTION_1---
[content]
---SECTION_2---
[content]

Return cleaned sections in this EXACT format:
---CLEANED_1---
[cleaned content]
---CLEANED_2---
[cleaned content]

INPUT SECTIONS:
{batch_content}

CLEANED SECTIONS:"""


class ContentCleaningService:
    """Service for LLM-based content cleaning"""

    def __init__(self, delay_seconds: float = 2.5):
        """
        Initialize cleaning service

        Args:
            delay_seconds: Delay between API calls to respect rate limits
        """
        self.groq = groq_client
        self.delay = delay_seconds
        self.stats = {
            'total_processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'start_time': None,
            'end_time': None
        }

    def clean_single(self, content: str) -> Optional[str]:
        """
        Clean a single content section using LLM

        Args:
            content: Raw content to clean

        Returns:
            Cleaned content or None if error
        """
        try:
            prompt = CLEANING_PROMPT.format(content=content)

            response = self.groq.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,  # Low temperature for consistent formatting
                max_tokens=4000
            )

            cleaned = response.choices[0].message.content.strip()
            return cleaned

        except Exception as e:
            print(f"❌ Error cleaning content: {e}")
            return None

    def clean_batch(self, contents: List[str]) -> List[Optional[str]]:
        """
        Clean multiple content sections in one API call

        Args:
            contents: List of raw contents to clean

        Returns:
            List of cleaned contents (None for failures)
        """
        try:
            # Format batch content
            batch_input = ""
            for i, content in enumerate(contents, 1):
                batch_input += f"---SECTION_{i}---\n{content}\n\n"

            prompt = BATCH_CLEANING_PROMPT.format(batch_content=batch_input)

            response = self.groq.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=8000
            )

            # Parse response
            cleaned_text = response.choices[0].message.content.strip()

            # Extract cleaned sections
            cleaned_sections = []
            for i in range(1, len(contents) + 1):
                marker = f"---CLEANED_{i}---"
                next_marker = f"---CLEANED_{i+1}---"

                if marker in cleaned_text:
                    start = cleaned_text.index(marker) + len(marker)
                    if next_marker in cleaned_text:
                        end = cleaned_text.index(next_marker)
                    else:
                        end = len(cleaned_text)

                    cleaned = cleaned_text[start:end].strip()
                    cleaned_sections.append(cleaned if cleaned else None)
                else:
                    cleaned_sections.append(None)

            return cleaned_sections

        except Exception as e:
            print(f"❌ Error cleaning batch: {e}")
            return [None] * len(contents)

    def process_sections(
        self,
        sections: List[DocumentSection],
        db_session: Session,
        batch_size: int = 5,
        dry_run: bool = False
    ):
        """
        Process all sections with batching and progress tracking

        Args:
            sections: List of DocumentSection objects to clean
            db_session: Database session for updates
            batch_size: Number of sections per API call
            dry_run: If True, don't save changes
        """
        self.stats['start_time'] = datetime.now()
        total = len(sections)

        print(f"\n{'='*80}")
        print(f"🧹 LLM Content Cleaning Migration")
        print(f"{'='*80}")
        print(f"Total sections: {total}")
        print(f"Batch size: {batch_size}")
        print(f"Estimated API calls: {(total + batch_size - 1) // batch_size}")
        print(f"Estimated time: {((total + batch_size - 1) // batch_size) * self.delay / 60:.1f} minutes")
        print(f"Mode: {'DRY RUN' if dry_run else 'LIVE'}")
        print(f"{'='*80}\n")

        # Process in batches
        for i in range(0, total, batch_size):
            batch = sections[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            print(f"📦 Batch {batch_num}/{total_batches} (sections {i+1}-{min(i+batch_size, total)})")

            # Extract contents
            contents = [s.content_original for s in batch]

            # Clean batch
            cleaned_contents = self.clean_batch(contents)

            # Update database
            for section, cleaned in zip(batch, cleaned_contents):
                self.stats['total_processed'] += 1

                if cleaned and cleaned != section.content_original:
                    if not dry_run:
                        # Update content_cleaned field
                        update_stmt = text("""
                            UPDATE document_sections
                            SET content_cleaned = :cleaned,
                                updated_at = NOW()
                            WHERE id = :section_id
                        """)
                        db_session.execute(
                            update_stmt,
                            {
                                'cleaned': cleaned,
                                'section_id': str(section.id)
                            }
                        )

                    self.stats['successful'] += 1
                    print(f"  ✅ {section.standard.value} {section.section_number}: Cleaned")

                elif cleaned == section.content_original:
                    self.stats['skipped'] += 1
                    print(f"  ⏭️  {section.standard.value} {section.section_number}: No changes needed")

                else:
                    self.stats['failed'] += 1
                    print(f"  ❌ {section.standard.value} {section.section_number}: Failed to clean")

            if not dry_run:
                db_session.commit()

            # Progress update
            progress = (i + len(batch)) / total * 100
            print(f"  📊 Progress: {progress:.1f}% ({i + len(batch)}/{total})")

            # Rate limiting delay (except for last batch)
            if i + batch_size < total:
                print(f"  ⏳ Waiting {self.delay}s (rate limit)...\n")
                time.sleep(self.delay)
            else:
                print()

        self.stats['end_time'] = datetime.now()
        self.print_summary()

    def print_summary(self):
        """Print final statistics"""
        duration = (self.stats['end_time'] - self.stats['start_time']).total_seconds()

        print(f"\n{'='*80}")
        print(f"✨ CLEANING COMPLETE!")
        print(f"{'='*80}")
        print(f"Total processed: {self.stats['total_processed']}")
        print(f"Successfully cleaned: {self.stats['successful']}")
        print(f"Skipped (no changes): {self.stats['skipped']}")
        print(f"Failed: {self.stats['failed']}")
        print(f"Duration: {duration/60:.1f} minutes")
        print(f"{'='*80}\n")


def fetch_sections(
    db_session: Session,
    standard: Optional[str] = None,
    limit: Optional[int] = None
) -> List[DocumentSection]:
    """
    Fetch sections from database

    Args:
        db_session: Database session
        standard: Filter by standard (PMBOK, PRINCE2, ISO_21502)
        limit: Limit number of sections (for testing)
    """
    query = db_session.query(DocumentSection)

    if standard:
        standard_enum = StandardType[standard]
        query = query.filter(DocumentSection.standard == standard_enum)

    query = query.order_by(
        DocumentSection.standard,
        DocumentSection.section_number
    )

    if limit:
        query = query.limit(limit)

    return query.all()


def show_preview(
    db_session: Session,
    standard: Optional[str] = None,
    section_idx: int = 0
):
    """Show a preview of what cleaning will do"""
    sections = fetch_sections(db_session, standard=standard, limit=10)

    if not sections or section_idx >= len(sections):
        print("❌ No sections found for preview")
        return

    section = sections[section_idx]
    cleaner = ContentCleaningService()

    print(f"\n{'='*80}")
    print(f"🔍 CLEANING PREVIEW")
    print(f"{'='*80}")
    print(f"Section: {section.standard.value} {section.section_number} - {section.section_title}")
    print(f"\n📄 ORIGINAL CONTENT:")
    print(f"{'-'*80}")
    print(section.content_original[:500] + "..." if len(section.content_original) > 500 else section.content_original)

    print(f"\n🧹 CLEANING...")
    cleaned = cleaner.clean_single(section.content_original)

    print(f"\n✨ CLEANED CONTENT:")
    print(f"{'-'*80}")
    print(cleaned[:500] + "..." if len(cleaned) > 500 else cleaned if cleaned else "❌ Failed to clean")
    print(f"\n{'='*80}\n")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Clean content using LLM"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Number of sections per API call (default: 5)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.5,
        help="Delay between API calls in seconds (default: 2.5)"
    )
    parser.add_argument(
        "--standard",
        choices=["PMBOK", "PRINCE2", "ISO_21502"],
        help="Clean only specific standard"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without saving"
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Show cleaning preview for one section"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of sections (for testing)"
    )

    args = parser.parse_args()

    # Database connection
    db = SessionLocal()

    try:
        if args.preview:
            show_preview(db, standard=args.standard)
            return

        # Fetch sections
        sections = fetch_sections(
            db,
            standard=args.standard,
            limit=args.limit
        )

        if not sections:
            print("❌ No sections found to clean")
            return

        # Confirm if not dry run
        if not args.dry_run:
            print(f"\n⚠️  WARNING: This will modify {len(sections)} sections in the database.")
            confirm = input("Continue? (yes/no): ").strip().lower()
            if confirm != "yes":
                print("❌ Cancelled")
                return

        # Process sections
        cleaner = ContentCleaningService(delay_seconds=args.delay)
        cleaner.process_sections(
            sections=sections,
            db_session=db,
            batch_size=args.batch_size,
            dry_run=args.dry_run
        )

        if not args.dry_run:
            print("✅ Content cleaning complete!")
            print("🔄 Next step: Regenerate embeddings")
            print("   Run: python backend/scripts/generate_embeddings.py")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        db.rollback()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()

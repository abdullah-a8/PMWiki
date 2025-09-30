#!/usr/bin/env python3
"""
Data loader script for PMWiki document sections migration.

This script loads chunks from PMBOK, PRINCE2, and ISO 21502 JSON files
into the PostgreSQL document_sections table with consistent structure.

Usage:
    python scripts/load_data.py [--standard STANDARD] [--dry-run] [--stats]
"""

import json
import sys
import argparse
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import re

# Add the backend app to Python path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.db.database import SessionLocal
from app.models.document_section import DocumentSection, StandardType
from sqlalchemy.orm import Session
from sqlalchemy import text


class DataLoader:
    """
    Unified data loader for all three project management standards.
    Maps JSON chunks to document_sections table structure.
    """

    def __init__(self):
        self.data_dir = Path(__file__).parent.parent / "data"
        self.processed_dir = self.data_dir / "processed"
        self.raw_dir = self.data_dir / "raw"

        # File mappings - use cleaned PMBOK, raw for others
        self.file_mapping = {
            "PMBOK": self.processed_dir / "PMBOK_chunks_cleaned.json",
            "PRINCE2": self.raw_dir / "PRINCE2_chunks.json",
            "ISO_21502": self.raw_dir / "ISO_21502_chunks.json"
        }

    def load_json_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load and validate JSON chunk file."""
        if not file_path.exists():
            raise FileNotFoundError(f"Data file not found: {file_path}")

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if not isinstance(data, list):
            raise ValueError(f"Expected list of chunks, got {type(data)}")

        print(f"✅ Loaded {len(data)} chunks from {file_path.name}")
        return data

    def normalize_standard_name(self, standard: str) -> str:
        """Normalize standard name to match ENUM values."""
        standard_upper = standard.upper().strip()

        # Handle ISO variations
        if "ISO" in standard_upper:
            return "ISO_21502"
        elif standard_upper == "PMBOK":
            return "PMBOK"
        elif "PRINCE" in standard_upper:
            return "PRINCE2"

        return standard_upper

    def generate_citation_key(self, chunk: Dict[str, Any]) -> str:
        """
        Generate citation key matching schema pattern: ^[A-Z0-9_]+_\d+(\.\d+)*$
        Example: PMBOK_1.2_5 (section 1.2, page 5), PRINCE2_3.4.1_10
        """
        standard = self.normalize_standard_name(chunk.get("standard", "UNK"))
        section = chunk.get("section_number", "0")
        page = chunk.get("page_start", 0)

        # Clean section number to ensure it matches pattern
        section_clean = re.sub(r'[^\d.]', '', str(section))
        if not section_clean:
            section_clean = "0"

        # Include page number to make key unique (sections can repeat on different pages)
        citation_key = f"{standard}_{section_clean}_{page}"
        return citation_key

    def normalize_chunk(self, chunk: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize chunk data to match document_sections table structure.

        Maps JSON fields to schema.sql structure:
        - text -> content, content_cleaned, content_original
        - parent_chain -> JSONB format
        - standard -> ENUM type
        """
        # Get text content with fallbacks
        text_content = chunk.get("text", "")
        text_original = chunk.get("text_original", text_content)

        # Ensure we have content
        if not text_content.strip():
            text_content = text_original

        # Normalize standard name
        standard_normalized = self.normalize_standard_name(chunk.get("standard", ""))

        # Handle parent_chain - convert to proper JSONB format
        parent_chain = chunk.get("parent_chain", [])
        if not isinstance(parent_chain, list):
            parent_chain = []

        # Normalize parent_chain to consistent format
        normalized_parent_chain = []
        for parent in parent_chain:
            if isinstance(parent, dict):
                normalized_parent_chain.append({
                    "section_number": parent.get("section_number", ""),
                    "title": parent.get("title", "")
                })
            elif isinstance(parent, str):
                normalized_parent_chain.append({
                    "section_number": parent,
                    "title": ""
                })

        # Build normalized data matching document_sections schema
        normalized = {
            # Core citation fields
            "standard": standard_normalized,
            "section_number": str(chunk.get("section_number", "0")),
            "section_title": chunk.get("section_title", "Untitled"),
            "level": int(chunk.get("level", 0)),

            # Page references
            "page_start": chunk.get("page_start"),
            "page_end": chunk.get("page_end"),

            # Content fields (3 versions as per schema)
            "content": text_content,
            "content_cleaned": text_content,  # We'll use same as content for now
            "content_original": text_original,

            # Hierarchical data
            "parent_section_id": None,  # Will be set later if needed
            "parent_chain": normalized_parent_chain,
            "child_count": 0,

            # Content metadata
            "content_flags": chunk.get("content_flags", {}),

            # Embedding fields
            "embedding_model": "voyage-3-large",
            "embedding_created_at": None,  # Will be set when embeddings generated

            # Citation key
            "citation_key": self.generate_citation_key(chunk),

            # Timestamps
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        return normalized

    def validate_chunk(self, chunk: Dict[str, Any]) -> tuple[bool, str]:
        """
        Validate that chunk has required fields for document_sections table.

        Returns:
            tuple: (is_valid, error_message)
        """
        required_fields = ["standard", "section_number", "section_title", "level", "content"]

        missing_fields = [field for field in required_fields if not chunk.get(field)]

        if missing_fields:
            return False, f"Missing required fields: {missing_fields}"

        # Validate standard is valid enum value
        try:
            standard_normalized = self.normalize_standard_name(chunk["standard"])
            if standard_normalized not in ["PMBOK", "PRINCE2", "ISO_21502"]:
                return False, f"Invalid standard: {chunk['standard']}"
        except Exception as e:
            return False, f"Invalid standard format: {e}"

        # Validate level is in valid range (0-5)
        level = chunk.get("level", 0)
        if not isinstance(level, int) or level < 0 or level > 5:
            return False, f"Invalid level: {level} (must be 0-5)"

        # Validate content is not empty
        if not chunk["content"].strip():
            return False, "Empty content"

        return True, ""

    def load_standard_data(
        self,
        standard: str,
        session: Session,
        dry_run: bool = False
    ) -> int:
        """Load chunks for a specific standard into database."""
        file_path = self.file_mapping.get(standard)
        if not file_path:
            raise ValueError(f"Unknown standard: {standard}")

        print(f"\n📚 Loading {standard} data from {file_path.name}")

        # Load raw data
        raw_chunks = self.load_json_file(file_path)

        # Process and validate chunks
        valid_chunks = []
        skipped_count = 0
        errors = []

        for i, chunk_data in enumerate(raw_chunks):
            try:
                normalized = self.normalize_chunk(chunk_data)
                is_valid, error_msg = self.validate_chunk(normalized)

                if is_valid:
                    valid_chunks.append(normalized)
                else:
                    skipped_count += 1
                    errors.append(f"Chunk {i}: {error_msg}")
            except Exception as e:
                skipped_count += 1
                errors.append(f"Chunk {i}: {str(e)}")

        print(f"✅ Processed {len(valid_chunks)} valid chunks")
        if skipped_count > 0:
            print(f"⚠️ Skipped {skipped_count} invalid chunks")
            if errors and len(errors) <= 5:  # Show first 5 errors
                for error in errors[:5]:
                    print(f"   - {error}")

        if dry_run:
            print(f"🔍 DRY RUN: Would insert {len(valid_chunks)} {standard} chunks")
            if valid_chunks:
                print(f"\n📋 Sample chunk structure:")
                sample = valid_chunks[0]
                for key, value in sample.items():
                    if key not in ['content', 'content_cleaned', 'content_original']:
                        print(f"   {key}: {value}")
            return len(valid_chunks)

        # Insert into database
        inserted_count = 0
        duplicate_count = 0
        error_count = 0

        for chunk_data in valid_chunks:
            try:
                # Use savepoint for each insert to avoid rolling back entire transaction
                savepoint = session.begin_nested()
                try:
                    # Create DocumentSection instance
                    section = DocumentSection(**chunk_data)
                    session.add(section)
                    session.flush()  # Flush to catch unique constraint violations
                    savepoint.commit()
                    inserted_count += 1
                except Exception as e:
                    savepoint.rollback()
                    if "unique constraint" in str(e).lower() or "duplicate" in str(e).lower():
                        duplicate_count += 1
                    else:
                        error_count += 1
                        if error_count <= 3:  # Show first 3 errors only
                            print(f"⚠️ Error inserting chunk {chunk_data.get('citation_key', 'unknown')}: {e}")
            except Exception as e:
                error_count += 1
                if error_count <= 3:
                    print(f"⚠️ Unexpected error: {e}")
                continue

        session.commit()
        print(f"✅ Successfully inserted {inserted_count} {standard} chunks")
        if duplicate_count > 0:
            print(f"⚠️ Skipped {duplicate_count} duplicate citation keys")
        if error_count > 0:
            print(f"⚠️ {error_count} errors occurred during insertion")

        return inserted_count

    def load_all_standards(self, dry_run: bool = False) -> Dict[str, int]:
        """Load all three standards into database."""
        results = {}

        with SessionLocal() as session:
            for standard in ["PMBOK", "PRINCE2", "ISO_21502"]:
                try:
                    count = self.load_standard_data(standard, session, dry_run)
                    results[standard] = count
                except Exception as e:
                    print(f"❌ Failed to load {standard}: {e}")
                    results[standard] = 0
                    import traceback
                    traceback.print_exc()

        return results

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about available data files."""
        stats = {}

        for standard, file_path in self.file_mapping.items():
            if file_path.exists():
                try:
                    chunks = self.load_json_file(file_path)
                    stats[standard] = {
                        "file": file_path.name,
                        "chunks": len(chunks),
                        "exists": True
                    }
                except Exception as e:
                    stats[standard] = {
                        "file": file_path.name,
                        "chunks": 0,
                        "exists": True,
                        "error": str(e)
                    }
            else:
                stats[standard] = {
                    "file": file_path.name,
                    "chunks": 0,
                    "exists": False
                }

        return stats

    def verify_database_load(self) -> Dict[str, Any]:
        """Verify data was loaded correctly into database."""
        with SessionLocal() as session:
            try:
                # Count total sections
                total_count = session.query(DocumentSection).count()

                # Count by standard
                pmbok_count = session.query(DocumentSection).filter(
                    DocumentSection.standard == StandardType.PMBOK
                ).count()

                prince2_count = session.query(DocumentSection).filter(
                    DocumentSection.standard == StandardType.PRINCE2
                ).count()

                iso_count = session.query(DocumentSection).filter(
                    DocumentSection.standard == StandardType.ISO_21502
                ).count()

                return {
                    "total": total_count,
                    "PMBOK": pmbok_count,
                    "PRINCE2": prince2_count,
                    "ISO_21502": iso_count,
                    "success": True
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e)
                }


def main():
    """Main entry point for data loading script."""
    parser = argparse.ArgumentParser(
        description="Load PMWiki document sections into database"
    )
    parser.add_argument(
        "--standard",
        choices=["PMBOK", "PRINCE2", "ISO_21502", "all"],
        default="all",
        help="Which standard to load (default: all)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be loaded without actually inserting data"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics about available data files"
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Verify data loaded in database"
    )

    args = parser.parse_args()

    loader = DataLoader()

    if args.stats:
        print("📊 Data File Statistics:")
        stats = loader.get_statistics()
        for standard, info in stats.items():
            status = "✅" if info["exists"] else "❌"
            error_info = f" (Error: {info.get('error', 'N/A')})" if info.get("error") else ""
            print(f"  {status} {standard}: {info['chunks']} chunks in {info['file']}{error_info}")
        return

    if args.verify:
        print("🔍 Verifying database content:")
        results = loader.verify_database_load()
        if results["success"]:
            print(f"  Total sections: {results['total']}")
            print(f"  PMBOK: {results['PMBOK']}")
            print(f"  PRINCE2: {results['PRINCE2']}")
            print(f"  ISO 21502: {results['ISO_21502']}")
        else:
            print(f"  ❌ Error: {results['error']}")
        return

    print("🚀 PMWiki Data Loader")
    print("=" * 50)
    print(f"📌 Using PMBOK_chunks_cleaned.json (cleaner structure)")
    print("=" * 50)

    try:
        if args.standard == "all":
            results = loader.load_all_standards(dry_run=args.dry_run)
            total_chunks = sum(results.values())

            print("\n📊 Loading Summary:")
            for standard, count in results.items():
                print(f"  {standard}: {count} chunks")
            print(f"  TOTAL: {total_chunks} chunks")

            if not args.dry_run:
                print(f"\n✅ Successfully loaded {total_chunks} chunks into database!")
                print("\n🔍 Verifying...")
                verify_results = loader.verify_database_load()
                if verify_results["success"]:
                    print(f"   Database contains {verify_results['total']} sections ✅")
        else:
            with SessionLocal() as session:
                count = loader.load_standard_data(args.standard, session, args.dry_run)
                print(f"\n✅ Successfully loaded {count} {args.standard} chunks!")

    except Exception as e:
        print(f"\n❌ Error during data loading: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
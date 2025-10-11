"""
Generate embeddings for all document sections
Stores embeddings in both PostgreSQL (pgvector) and Qdrant
"""
import sys
import os
from pathlib import Path

# Load environment variables FIRST
from dotenv import load_dotenv

# Detect if running from backend/scripts or project root
current_file = Path(__file__).resolve()
backend_dir = current_file.parent.parent
project_root = backend_dir.parent

# Try loading .env from multiple locations
env_locations = [
    project_root / ".env",
    backend_dir / ".env",
]

env_loaded = False
for env_path in env_locations:
    if env_path.exists():
        load_dotenv(env_path)
        env_loaded = True
        break

if not env_loaded:
    print("⚠️  Warning: No .env file found")

# Ensure correct environment variables are set
if not os.getenv("QDRANT_COLLECTION_NAME"):
    os.environ["QDRANT_COLLECTION_NAME"] = "pmwiki_sections"

# Add backend directory to path
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, text
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document_section import DocumentSection
from app.services.voyage_service import get_voyage_service
from app.services.qdrant_service import get_qdrant_service
from datetime import datetime
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fetch_all_sections(db: Session) -> List[DocumentSection]:
    """Fetch all document sections from database"""
    logger.info("Fetching all document sections from database...")
    stmt = select(DocumentSection).order_by(DocumentSection.standard, DocumentSection.section_number)
    result = db.execute(stmt)
    sections = result.scalars().all()
    logger.info(f"✅ Fetched {len(sections)} sections")
    return sections


def prepare_citation_enhanced_texts(sections: List[DocumentSection]) -> List[str]:
    """Prepare citation-enhanced texts for embedding (as per BACKEND_REPORT)"""
    logger.info("Preparing citation-enhanced texts...")

    texts = []
    for section in sections:
        citation_text = f"""Standard: {section.standard.value}
Section: {section.section_number} - {section.section_title}
Page: {section.page_start if section.page_start else 'N/A'}

Content: {section.content_cleaned}"""
        texts.append(citation_text)

    logger.info(f"✅ Prepared {len(texts)} citation-enhanced texts")
    return texts


def generate_embeddings_batch(texts: List[str], batch_size: int = 50) -> List[List[float]]:
    """Generate embeddings for all texts"""
    logger.info(f"Generating embeddings for {len(texts)} texts...")

    voyage = get_voyage_service()

    # Generate embeddings with batch processing
    # No delay needed since rate limits are now higher with payment method
    embeddings = voyage.embed_texts(
        texts=texts,
        input_type="document",
        batch_size=batch_size,
        delay_between_batches=0.5  # Minimal delay with standard rate limits
    )

    logger.info(f"✅ Generated {len(embeddings)} embeddings")
    return embeddings


def store_in_qdrant(sections: List[DocumentSection], embeddings: List[List[float]]):
    """Store embeddings in Qdrant vector database"""
    logger.info("Storing embeddings in Qdrant...")

    qdrant = get_qdrant_service()

    # Prepare points for Qdrant
    points = []
    for section, embedding in zip(sections, embeddings):
        point = {
            'id': str(section.id),  # Use UUID as string ID
            'vector': embedding,
            'payload': {
                'standard': section.standard.value,
                'section_number': section.section_number,
                'section_title': section.section_title,
                'level': section.level,
                'page_start': section.page_start,
                'page_end': section.page_end,
                'citation_key': section.citation_key,
                'content': section.content_cleaned,
                'parent_chain': section.parent_chain,
                'word_count': section.word_count
            }
        }
        points.append(point)

    # Upsert to Qdrant
    count = qdrant.upsert_points(points, batch_size=100)
    logger.info(f"✅ Stored {count} embeddings in Qdrant")


def store_in_postgresql(db: Session, sections: List[DocumentSection], embeddings: List[List[float]]):
    """Store embeddings in PostgreSQL using pgvector"""
    logger.info("Storing embeddings in PostgreSQL...")

    model_name = "voyage-3-large"
    timestamp = datetime.now()

    for i, (section, embedding) in enumerate(zip(sections, embeddings), 1):
        if i % 50 == 0:
            logger.info(f"   Progress: {i}/{len(sections)} sections...")

        # Convert embedding to PostgreSQL vector format
        vector_str = '[' + ','.join(map(str, embedding)) + ']'

        # Update section with embedding using proper parameter binding
        update_stmt = text("""
            UPDATE document_sections
            SET embedding = CAST(:embedding AS vector),
                embedding_model = :model,
                embedding_created_at = :timestamp,
                updated_at = :timestamp
            WHERE id = CAST(:section_id AS uuid)
        """)

        db.execute(
            update_stmt,
            {
                'embedding': vector_str,
                'model': model_name,
                'timestamp': timestamp,
                'section_id': str(section.id)
            }
        )

    db.commit()
    logger.info(f"✅ Stored {len(embeddings)} embeddings in PostgreSQL")


def main():
    """Main execution function"""
    logger.info("=" * 80)
    logger.info("🚀 STARTING EMBEDDING GENERATION PIPELINE")
    logger.info("=" * 80)

    try:
        # Get database session
        db = next(get_db())

        # Step 1: Fetch all sections
        logger.info("\n📚 STEP 1: Fetching document sections")
        sections = fetch_all_sections(db)

        if not sections:
            logger.error("❌ No sections found in database!")
            return

        # Print summary by standard
        from collections import Counter
        standard_counts = Counter(s.standard.value for s in sections)
        logger.info("\n📊 Sections by Standard:")
        for standard, count in sorted(standard_counts.items()):
            logger.info(f"   {standard}: {count} sections")
        logger.info(f"   TOTAL: {len(sections)} sections")

        # Step 2: Prepare citation-enhanced texts
        logger.info("\n📝 STEP 2: Preparing citation-enhanced texts")
        texts = prepare_citation_enhanced_texts(sections)

        # Step 3: Generate embeddings
        logger.info("\n🔮 STEP 3: Generating embeddings with Voyage AI")
        logger.info("   This may take a few minutes...")
        embeddings = generate_embeddings_batch(texts, batch_size=50)

        # Verify dimensions
        if embeddings:
            logger.info(f"   ✅ Embedding dimension: {len(embeddings[0])}")

        # Step 4: Store in Qdrant
        logger.info("\n📦 STEP 4: Storing embeddings in Qdrant")
        store_in_qdrant(sections, embeddings)

        # Step 5: Store in PostgreSQL
        logger.info("\n💾 STEP 5: Storing embeddings in PostgreSQL")
        store_in_postgresql(db, sections, embeddings)

        # Final verification
        logger.info("\n✅ VERIFICATION")
        qdrant_info = get_qdrant_service().get_collection_info()
        logger.info(f"   Qdrant points: {qdrant_info['points_count']}")

        # Check PostgreSQL
        count_stmt = text("SELECT COUNT(*) FROM document_sections WHERE embedding IS NOT NULL")
        pg_count = db.execute(count_stmt).scalar()
        logger.info(f"   PostgreSQL embeddings: {pg_count}")

        logger.info("\n" + "=" * 80)
        logger.info("✨ EMBEDDING GENERATION COMPLETE!")
        logger.info("=" * 80)
        logger.info(f"\n📊 Summary:")
        logger.info(f"   Total sections processed: {len(sections)}")
        logger.info(f"   Embeddings generated: {len(embeddings)}")
        logger.info(f"   Stored in Qdrant: {qdrant_info['points_count']}")
        logger.info(f"   Stored in PostgreSQL: {pg_count}")
        logger.info(f"\n🎯 Your RAG system is now ready for semantic search!")

    except Exception as e:
        logger.error(f"\n❌ ERROR: {e}", exc_info=True)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
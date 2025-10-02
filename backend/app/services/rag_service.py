"""
RAG Response Service
Orchestrates the full RAG pipeline: retrieval + generation with citations
"""
from typing import List, Dict, Any, Optional
import logging
from app.services.voyage_service import get_voyage_service
from app.services.qdrant_service import get_qdrant_service
from app.services.groq_service import get_groq_service
from sqlalchemy.orm import Session
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGService:
    """Service for citation-focused RAG operations"""

    def __init__(self):
        """Initialize RAG service with all required components"""
        self.voyage_service = get_voyage_service()
        self.qdrant_service = get_qdrant_service()
        self.groq_service = get_groq_service()
        logger.info("RAGService initialized")

    def query_with_citations(
        self,
        query: str,
        db_session: Session,
        top_k_per_standard: int = 3,
        score_threshold: float = 0.4
    ) -> Dict[str, Any]:
        """
        Perform citation-focused RAG query

        This method:
        1. Embeds the query
        2. Searches for top chunks from EACH standard
        3. Fetches full metadata from database
        4. Sends highest-scoring chunk per standard + additional context to LLM
        5. Returns structured response with citations and additional reading

        Args:
            query: User's search query
            db_session: SQLAlchemy database session
            top_k_per_standard: Number of chunks to retrieve per standard
            score_threshold: Minimum similarity score (0-1)

        Returns:
            Dictionary with:
                - answer: LLM-generated response with citations
                - primary_sources: Top chunk from each standard (3 total)
                - additional_context: Extra chunks for "read more"
                - usage_stats: Token usage and metadata
        """
        logger.info(f"Processing RAG query: '{query}'")

        # Step 1: Generate query embedding
        query_embedding = self.voyage_service.embed_query(query)
        logger.info("Query embedded successfully")

        # Step 2: Search for relevant chunks from each standard
        standards = ["PMBOK", "PRINCE2", "ISO_21502"]
        all_results = {}

        for standard in standards:
            results = self.qdrant_service.search_by_standard(
                query_vector=query_embedding,
                standard=standard,
                limit=top_k_per_standard,
                score_threshold=score_threshold
            )
            all_results[standard] = results
            logger.info(f"Found {len(results)} results for {standard}")

        # Step 3: Fetch full metadata from database for all chunks
        chunk_data = self._fetch_chunk_metadata(all_results, db_session)

        # Step 4: Separate primary (top 1) and additional chunks per standard
        primary_chunks = []
        additional_chunks = []

        for standard in standards:
            if chunk_data[standard]:
                # Top chunk is primary
                primary = chunk_data[standard][0]
                primary['is_primary'] = True
                primary_chunks.append(primary)

                # Rest are additional
                for chunk in chunk_data[standard][1:]:
                    chunk['is_primary'] = False
                    additional_chunks.append(chunk)

        # Step 5: Generate LLM response
        all_context = primary_chunks + additional_chunks
        llm_response = self.groq_service.generate_citation_response(
            query=query,
            context_chunks=all_context,
            temperature=0.3
        )

        # Step 6: Structure the response
        result = {
            'query': query,
            'answer': llm_response['content'],
            'primary_sources': [
                {
                    'id': chunk['id'],
                    'standard': chunk['standard'],
                    'section_number': chunk['section_number'],
                    'section_title': chunk['section_title'],
                    'page_start': chunk['page_start'],
                    'page_end': chunk['page_end'],
                    'content': chunk['content'],
                    'citation': self._format_citation(chunk),
                    'relevance_score': chunk['score']
                }
                for chunk in primary_chunks
            ],
            'additional_context': [
                {
                    'id': chunk['id'],
                    'standard': chunk['standard'],
                    'section_number': chunk['section_number'],
                    'section_title': chunk['section_title'],
                    'page_start': chunk['page_start'],
                    'page_end': chunk['page_end'],
                    'content': chunk['content'],
                    'citation': self._format_citation(chunk),
                    'relevance_score': chunk['score']
                }
                for chunk in additional_chunks
            ],
            'usage_stats': {
                'model': llm_response['model'],
                'tokens': llm_response['usage'],
                'chunks_retrieved': len(all_context),
                'primary_sources_count': len(primary_chunks),
                'additional_sources_count': len(additional_chunks)
            }
        }

        logger.info(f"RAG query completed. Primary sources: {len(primary_chunks)}, Additional: {len(additional_chunks)}")
        return result

    def compare_standards(
        self,
        topic: str,
        db_session: Session,
        top_k_per_standard: int = 2,
        score_threshold: float = 0.4
    ) -> Dict[str, Any]:
        """
        Compare how different standards address a topic

        Args:
            topic: Topic to compare (e.g., "Risk Management")
            db_session: Database session
            top_k_per_standard: Chunks to retrieve per standard
            score_threshold: Minimum similarity score

        Returns:
            Dictionary with comparison analysis and sources
        """
        logger.info(f"Comparing standards on topic: '{topic}'")

        # Embed the topic
        topic_embedding = self.voyage_service.embed_query(topic)

        # Search each standard
        standards = ["PMBOK", "PRINCE2", "ISO_21502"]
        all_results = {}

        for standard in standards:
            results = self.qdrant_service.search_by_standard(
                query_vector=topic_embedding,
                standard=standard,
                limit=top_k_per_standard,
                score_threshold=score_threshold
            )
            all_results[standard] = results

        # Fetch metadata
        chunk_data = self._fetch_chunk_metadata(all_results, db_session)

        # Generate comparison
        llm_response = self.groq_service.generate_comparison_response(
            topic=topic,
            pmbok_chunks=chunk_data["PMBOK"],
            prince2_chunks=chunk_data["PRINCE2"],
            iso_chunks=chunk_data["ISO_21502"],
            temperature=0.3
        )

        # Structure response
        result = {
            'topic': topic,
            'comparison': llm_response['content'],
            'sources': {
                'PMBOK': [self._format_source(c) for c in chunk_data["PMBOK"]],
                'PRINCE2': [self._format_source(c) for c in chunk_data["PRINCE2"]],
                'ISO_21502': [self._format_source(c) for c in chunk_data["ISO_21502"]]
            },
            'usage_stats': {
                'model': llm_response['model'],
                'tokens': llm_response['usage']
            }
        }

        logger.info(f"Comparison completed for topic: {topic}")
        return result

    def generate_process(
        self,
        project_description: str,
        project_type: str,
        project_size: str,
        constraints: Optional[List[str]],
        priorities: Optional[List[str]],
        focus_areas: Optional[List[str]],
        db_session: Session,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Generate a tailored project process based on scenario and standards

        Args:
            project_description: Description of the project
            project_type: Type of project (e.g., software_development)
            project_size: Size of project (small/medium/large)
            constraints: List of constraints (e.g., "tight deadline")
            priorities: List of priorities (e.g., "quality", "speed")
            focus_areas: Specific areas to emphasize (e.g., "risk management")
            db_session: Database session
            top_k: Number of relevant sections to retrieve per focus area

        Returns:
            Dictionary with tailored process, phases, recommendations, and citations
        """
        logger.info(f"Generating process for {project_type} project ({project_size})")

        # Build search queries based on focus areas and project type
        search_queries = []

        # Always search for core project management concepts
        core_queries = [
            f"{project_type} project lifecycle phases",
            "project initiation and planning",
            "project execution and monitoring",
            "project closure and lessons learned"
        ]
        search_queries.extend(core_queries)

        # Add focus areas if provided
        if focus_areas:
            search_queries.extend(focus_areas)

        # Add priority-related queries
        if priorities:
            for priority in priorities[:2]:  # Limit to top 2 priorities
                search_queries.append(f"{priority} in project management")

        # Collect relevant sections from all standards
        all_chunks = []
        for query in search_queries:
            query_embedding = self.voyage_service.embed_query(query)

            # Search across all standards
            results = self.qdrant_service.search(
                query_vector=query_embedding,
                limit=top_k,
                score_threshold=0.45
            )

            # Extract IDs and fetch metadata
            if results:
                chunk_ids = [str(r['id']) for r in results]
                scores = {str(r['id']): r['score'] for r in results}

                query_text = text("""
                    SELECT
                        id::text as id,
                        standard::text,
                        section_number,
                        section_title,
                        page_start,
                        page_end,
                        content_cleaned as content,
                        citation_key
                    FROM document_sections
                    WHERE id::text = ANY(:ids)
                """)

                rows = db_session.execute(query_text, {"ids": chunk_ids}).fetchall()

                for row in rows:
                    chunk = dict(row._mapping)
                    chunk['score'] = scores.get(chunk['id'], 0.0)
                    chunk['search_query'] = query  # Track which query found this
                    all_chunks.append(chunk)

        # Deduplicate chunks by ID (keep highest score)
        seen_ids = {}
        for chunk in all_chunks:
            chunk_id = chunk['id']
            if chunk_id not in seen_ids or chunk['score'] > seen_ids[chunk_id]['score']:
                seen_ids[chunk_id] = chunk

        unique_chunks = list(seen_ids.values())

        # Sort by score and limit to top 15 most relevant
        unique_chunks.sort(key=lambda x: x['score'], reverse=True)
        top_chunks = unique_chunks[:15]

        logger.info(f"Retrieved {len(top_chunks)} unique relevant sections for process generation")

        # Generate process using LLM
        llm_response = self.groq_service.generate_process_response(
            project_description=project_description,
            project_type=project_type,
            project_size=project_size,
            constraints=constraints or [],
            priorities=priorities or [],
            focus_areas=focus_areas or [],
            context_chunks=top_chunks,
            temperature=0.4  # Slightly higher for more creative process generation
        )

        # Structure response
        result = {
            'project_type': project_type,
            'project_size': project_size,
            'process_data': llm_response['content'],  # LLM returns structured JSON
            'source_sections_count': len(top_chunks),
            'standards_used': list(set(c['standard'] for c in top_chunks)),
            'usage_stats': {
                'model': llm_response['model'],
                'tokens': llm_response['usage']
            }
        }

        logger.info(f"Process generation completed using {len(top_chunks)} sections from {len(result['standards_used'])} standards")
        return result

    def _fetch_chunk_metadata(
        self,
        search_results: Dict[str, List[Dict[str, Any]]],
        db_session: Session
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch full metadata for chunks from database

        Args:
            search_results: Dict mapping standard name to list of search results
            db_session: Database session

        Returns:
            Dict mapping standard name to list of enriched chunk data
        """
        enriched_data = {}

        for standard, results in search_results.items():
            if not results:
                enriched_data[standard] = []
                continue

            # Extract IDs and scores
            chunk_ids = [str(result['id']) for result in results]
            scores = {str(result['id']): result['score'] for result in results}

            # Fetch from database
            query = text("""
                SELECT
                    id::text as id,
                    standard::text,
                    section_number,
                    section_title,
                    page_start,
                    page_end,
                    content_cleaned as content,
                    citation_key
                FROM document_sections
                WHERE id::text = ANY(:ids)
                ORDER BY array_position(:ids, id::text)
            """)

            rows = db_session.execute(query, {"ids": chunk_ids}).fetchall()

            # Convert to dictionaries with scores
            chunks = []
            for row in rows:
                chunk = dict(row._mapping)
                chunk['score'] = scores.get(chunk['id'], 0.0)
                chunks.append(chunk)

            enriched_data[standard] = chunks

        return enriched_data

    def _format_citation(self, chunk: Dict[str, Any]) -> str:
        """Format citation string (APA style)"""
        standard = chunk['standard']
        section = chunk['section_number']
        page_start = chunk['page_start']
        page_end = chunk.get('page_end')

        # Determine publication year
        year_map = {
            'PMBOK': '2021',
            'PRINCE2': '2017',
            'ISO_21502': '2020'
        }
        year = year_map.get(standard, '2021')

        # Format page reference
        if page_end and page_end != page_start:
            page_ref = f"pp. {page_start}-{page_end}"
        else:
            page_ref = f"p. {page_start}"

        return f"{standard} ({year}), Section {section}, {page_ref}"

    def _format_source(self, chunk: Dict[str, Any]) -> Dict[str, Any]:
        """Format chunk as a source reference"""
        return {
            'section_number': chunk['section_number'],
            'section_title': chunk['section_title'],
            'page_start': chunk['page_start'],
            'page_end': chunk['page_end'],
            'citation': self._format_citation(chunk),
            'relevance_score': chunk['score'],
            'content_preview': chunk['content'][:200] + '...' if len(chunk['content']) > 200 else chunk['content']
        }


# Singleton instance
_rag_service = None

def get_rag_service() -> RAGService:
    """Get or create the RAG service singleton"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
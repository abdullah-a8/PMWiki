"""
Voyage AI Embedding Service
Handles embedding generation using Voyage AI's voyage-3-large model
"""
import os
import voyageai
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
import logging
import time
from voyageai.error import RateLimitError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class VoyageEmbeddingService:
    """Service for generating embeddings using Voyage AI"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Voyage AI client

        Args:
            api_key: Voyage AI API key (defaults to VOYAGE_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("VOYAGE_API_KEY")
        if not self.api_key:
            raise ValueError("VOYAGE_API_KEY not found in environment variables")

        self.client = voyageai.Client(api_key=self.api_key)
        self.model = "voyage-3-large"  # Best general-purpose model
        self.embedding_dimension = 1024  # voyage-3-large dimension

        logger.info(f"VoyageEmbeddingService initialized with model: {self.model}")

    def embed_texts(
        self,
        texts: List[str],
        input_type: str = "document",
        batch_size: int = 128,
        delay_between_batches: float = 20.0,
        max_retries: int = 3
    ) -> List[List[float]]:
        """
        Generate embeddings for a list of texts with rate limit handling

        Args:
            texts: List of text strings to embed (max 1000 per request)
            input_type: "document" for corpus texts, "query" for search queries
            batch_size: Number of texts to process per batch (max 1000)
            delay_between_batches: Seconds to wait between batches (for rate limiting)
            max_retries: Maximum number of retries on rate limit errors

        Returns:
            List of embedding vectors
        """
        if not texts:
            logger.warning("Empty text list provided")
            return []

        # Voyage AI supports up to 1000 texts per request, but we'll use smaller batches
        all_embeddings = []
        num_batches = (len(texts) + batch_size - 1) // batch_size

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_num = i//batch_size + 1
            logger.info(f"Processing batch {batch_num}/{num_batches}: {len(batch)} texts")

            retries = 0
            while retries < max_retries:
                try:
                    result = self.client.embed(
                        texts=batch,
                        model=self.model,
                        input_type=input_type
                    )
                    all_embeddings.extend(result.embeddings)
                    logger.info(f"Successfully generated {len(result.embeddings)} embeddings")
                    break
                except RateLimitError as e:
                    retries += 1
                    if retries >= max_retries:
                        logger.error(f"Max retries exceeded for batch {batch_num}")
                        raise
                    wait_time = delay_between_batches * retries
                    logger.warning(f"Rate limit hit. Waiting {wait_time}s before retry {retries}/{max_retries}")
                    time.sleep(wait_time)
                except Exception as e:
                    logger.error(f"Error generating embeddings for batch {batch_num}: {e}")
                    raise

            # Wait between batches to respect rate limits (except for last batch)
            if i + batch_size < len(texts):
                logger.info(f"Waiting {delay_between_batches}s before next batch...")
                time.sleep(delay_between_batches)

        return all_embeddings

    def embed_single(
        self,
        text: str,
        input_type: str = "document"
    ) -> List[float]:
        """
        Generate embedding for a single text

        Args:
            text: Text string to embed
            input_type: "document" for corpus text, "query" for search query

        Returns:
            Embedding vector
        """
        embeddings = self.embed_texts([text], input_type=input_type)
        return embeddings[0] if embeddings else []

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query

        Args:
            query: Search query text

        Returns:
            Embedding vector optimized for query
        """
        return self.embed_single(query, input_type="query")

    def embed_document(self, document: str) -> List[float]:
        """
        Generate embedding for a document

        Args:
            document: Document text

        Returns:
            Embedding vector optimized for documents
        """
        return self.embed_single(document, input_type="document")

    def embed_citation_enhanced_text(self, section_data: Dict[str, Any]) -> str:
        """
        Create citation-enhanced text for embedding (as per BACKEND_REPORT)

        Args:
            section_data: Dictionary containing section metadata

        Returns:
            Citation-enhanced text ready for embedding
        """
        citation_text = f"""
Standard: {section_data.get('standard', '')}
Section: {section_data.get('section_number', '')} - {section_data.get('section_title', '')}
Page: {section_data.get('page_start', '')}

Content: {section_data.get('text', '')}
        """.strip()

        return citation_text

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by the model"""
        return self.embedding_dimension


# Singleton instance
_voyage_service = None

def get_voyage_service() -> VoyageEmbeddingService:
    """Get or create the Voyage AI service singleton"""
    global _voyage_service
    if _voyage_service is None:
        _voyage_service = VoyageEmbeddingService()
    return _voyage_service
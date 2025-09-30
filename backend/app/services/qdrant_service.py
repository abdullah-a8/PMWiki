"""
Qdrant Vector Database Service
Handles vector storage, search, and retrieval operations
"""
import os
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchParams
)
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class QdrantService:
    """Service for managing Qdrant vector database operations"""

    def __init__(self, host: str = "localhost", port: int = 6333):
        """
        Initialize Qdrant client

        Args:
            host: Qdrant server host
            port: Qdrant server port
        """
        self.host = host
        self.port = port
        self.client = QdrantClient(host=host, port=port)
        self.collection_name = "pmwiki_sections"
        self.embedding_dimension = 1024  # voyage-3-large dimension

        logger.info(f"QdrantService initialized: {host}:{port}")

    def create_collection(self, recreate: bool = False) -> bool:
        """
        Create the PMWiki sections collection

        Args:
            recreate: If True, delete existing collection and recreate

        Returns:
            True if collection was created, False if it already exists
        """
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_exists = any(c.name == self.collection_name for c in collections)

            if collection_exists:
                if recreate:
                    logger.info(f"Deleting existing collection: {self.collection_name}")
                    self.client.delete_collection(self.collection_name)
                else:
                    logger.info(f"Collection {self.collection_name} already exists")
                    return False

            # Create new collection
            logger.info(f"Creating collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dimension,
                    distance=Distance.COSINE  # Cosine similarity for semantic search
                )
            )

            logger.info(f"✅ Collection {self.collection_name} created successfully")
            return True

        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise

    def upsert_points(
        self,
        points: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> int:
        """
        Insert or update points in the collection

        Args:
            points: List of dictionaries with 'id', 'vector', and 'payload' keys
            batch_size: Number of points to upsert per batch

        Returns:
            Total number of points upserted
        """
        try:
            total_points = len(points)
            logger.info(f"Upserting {total_points} points in batches of {batch_size}")

            for i in range(0, total_points, batch_size):
                batch = points[i:i + batch_size]
                batch_num = i // batch_size + 1
                num_batches = (total_points + batch_size - 1) // batch_size

                # Convert to PointStruct
                point_structs = [
                    PointStruct(
                        id=p['id'],
                        vector=p['vector'],
                        payload=p['payload']
                    )
                    for p in batch
                ]

                self.client.upsert(
                    collection_name=self.collection_name,
                    points=point_structs
                )

                logger.info(f"Batch {batch_num}/{num_batches}: Upserted {len(batch)} points")

            logger.info(f"✅ Successfully upserted {total_points} points")
            return total_points

        except Exception as e:
            logger.error(f"Error upserting points: {e}")
            raise

    def search(
        self,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search in the collection

        Args:
            query_vector: Query embedding vector
            limit: Maximum number of results to return
            score_threshold: Minimum similarity score (0-1 for cosine)
            filter_conditions: Optional metadata filters (e.g., {"standard": "PMBOK"})

        Returns:
            List of search results with scores and payloads
        """
        try:
            # Build filter if conditions provided
            query_filter = None
            if filter_conditions:
                must_conditions = [
                    FieldCondition(
                        key=key,
                        match=MatchValue(value=value)
                    )
                    for key, value in filter_conditions.items()
                ]
                query_filter = Filter(must=must_conditions)

            # Perform search
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=limit,
                query_filter=query_filter,
                score_threshold=score_threshold,
                with_payload=True
            )

            # Format results
            results = [
                {
                    'id': hit.id,
                    'score': hit.score,
                    'payload': hit.payload
                }
                for hit in search_result
            ]

            logger.info(f"Search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error performing search: {e}")
            raise

    def search_by_standard(
        self,
        query_vector: List[float],
        standard: str,
        limit: int = 5,
        score_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Search within a specific standard (PMBOK, PRINCE2, or ISO_21502)

        Args:
            query_vector: Query embedding vector
            standard: Standard name to filter by
            limit: Maximum number of results
            score_threshold: Minimum similarity score

        Returns:
            List of search results filtered by standard
        """
        return self.search(
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            filter_conditions={"standard": standard}
        )

    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about the collection

        Returns:
            Dictionary with collection statistics
        """
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                'name': self.collection_name,
                'vectors_count': info.vectors_count,
                'points_count': info.points_count,
                'status': info.status,
                'config': {
                    'dimension': self.embedding_dimension,
                    'distance': 'COSINE'
                }
            }
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            raise

    def delete_collection(self) -> bool:
        """Delete the collection"""
        try:
            self.client.delete_collection(self.collection_name)
            logger.info(f"Collection {self.collection_name} deleted")
            return True
        except Exception as e:
            logger.error(f"Error deleting collection: {e}")
            return False


# Singleton instance
_qdrant_service = None

def get_qdrant_service() -> QdrantService:
    """Get or create the Qdrant service singleton"""
    global _qdrant_service
    if _qdrant_service is None:
        _qdrant_service = QdrantService()
    return _qdrant_service
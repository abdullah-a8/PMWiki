"""
Graph API Router
Serves pre-computed topic network graph data for visualization
"""
from fastapi import APIRouter, Query, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Optional, List
import json
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Path to pre-computed graph data
GRAPH_DATA_PATH = Path(__file__).parent.parent.parent / 'data' / 'graph_data.json'


def load_graph_data() -> dict:
    """Load pre-computed graph data from JSON file"""
    try:
        if not GRAPH_DATA_PATH.exists():
            raise FileNotFoundError(f"Graph data file not found at {GRAPH_DATA_PATH}")
        
        with open(GRAPH_DATA_PATH, 'r') as f:
            return json.load(f)
    
    except FileNotFoundError:
        logger.error(f"Graph data file not found: {GRAPH_DATA_PATH}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Graph data not available. Please run generate_topic_clusters.py first."
        )
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in graph data file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Graph data file is corrupted"
        )
    except Exception as e:
        logger.error(f"Error loading graph data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load graph data: {str(e)}"
        )


def filter_graph_data(
    graph_data: dict,
    similarity_threshold: float,
    view_mode: str,
    standards: Optional[List[str]]
) -> dict:
    """Filter graph data based on query parameters"""
    
    filtered_data = {
        'metadata': graph_data['metadata'].copy(),
        'clusters': graph_data['clusters'].copy(),
        'nodes': [],
        'edges': []
    }
    
    # Filter nodes by standards
    nodes = graph_data['nodes']
    if standards:
        nodes = [n for n in nodes if n['standard'] in standards]
    
    # Handle view modes
    if view_mode == 'clusters':
        # Cluster view: Return cluster nodes instead of section nodes
        filtered_data['nodes'] = _create_cluster_nodes(
            graph_data['clusters'], 
            nodes,
            standards
        )
        # Create cluster-to-cluster edges
        filtered_data['edges'] = _create_cluster_edges(
            graph_data['edges'],
            nodes,
            similarity_threshold
        )
    else:
        # Section view: Return individual section nodes (current behavior)
        filtered_data['nodes'] = nodes
        
        # Get node IDs for edge filtering
        node_ids = set(n['id'] for n in nodes)
        
        # Filter edges by similarity threshold and node presence
        edges = graph_data['edges']
        edges = [
            e for e in edges
            if e['similarity'] >= similarity_threshold
            and e['source'] in node_ids
            and e['target'] in node_ids
        ]
        filtered_data['edges'] = edges
    
    # Update metadata
    filtered_data['metadata']['filtered'] = True
    filtered_data['metadata']['filter_params'] = {
        'similarity_threshold': similarity_threshold,
        'view_mode': view_mode,
        'standards': standards
    }
    filtered_data['metadata']['filtered_nodes'] = len(filtered_data['nodes'])
    filtered_data['metadata']['filtered_edges'] = len(filtered_data['edges'])
    
    return filtered_data


def _create_cluster_nodes(
    clusters: List[dict],
    filtered_sections: List[dict],
    standards_filter: Optional[List[str]]
) -> List[dict]:
    """
    Create cluster nodes for aggregated view.
    Each cluster node represents a group of sections.
    """
    cluster_nodes = []
    
    # Get section IDs that passed the standards filter
    filtered_section_ids = set(s['id'] for s in filtered_sections)
    
    # Count sections per cluster that match the filter
    cluster_section_counts = {}
    cluster_standards = {}
    
    for section in filtered_sections:
        cluster_id = section.get('cluster_id')
        if cluster_id:
            cluster_section_counts[cluster_id] = cluster_section_counts.get(cluster_id, 0) + 1
            if cluster_id not in cluster_standards:
                cluster_standards[cluster_id] = set()
            cluster_standards[cluster_id].add(section['standard'])
    
    # Create cluster nodes
    for cluster in clusters:
        cluster_id = cluster['id']
        member_count = cluster_section_counts.get(cluster_id, 0)
        
        # Skip clusters with no members after filtering
        if member_count == 0:
            continue
        
        # Get standards present in this cluster after filtering
        standards_in_cluster = list(cluster_standards.get(cluster_id, set()))
        
        cluster_nodes.append({
            'id': cluster_id,
            'type': 'cluster',
            'name': cluster['name'],
            'size': member_count,
            'original_size': cluster['size'],
            'standards': standards_in_cluster,
            'standard_counts': cluster.get('standard_counts', {}),
            'color': cluster['color'],
            'representative_section_id': cluster.get('representative_section_id')
        })
    
    return cluster_nodes


def _create_cluster_edges(
    section_edges: List[dict],
    filtered_sections: List[dict],
    similarity_threshold: float
) -> List[dict]:
    """
    Create edges between clusters based on cross-cluster section similarities.
    Aggregates all section-to-section edges into cluster-to-cluster edges.
    """
    # Build mapping of section_id -> cluster_id
    section_to_cluster = {s['id']: s.get('cluster_id') for s in filtered_sections}
    
    # Aggregate edges by cluster pairs
    cluster_pair_similarities = {}
    
    for edge in section_edges:
        if edge['similarity'] < similarity_threshold:
            continue
            
        source_cluster = section_to_cluster.get(edge['source'])
        target_cluster = section_to_cluster.get(edge['target'])
        
        # Skip if either section is not in filtered set or same cluster
        if not source_cluster or not target_cluster or source_cluster == target_cluster:
            continue
        
        # Create sorted pair key to avoid duplicates
        pair_key = tuple(sorted([source_cluster, target_cluster]))
        
        # Track max similarity and count for this cluster pair
        if pair_key not in cluster_pair_similarities:
            cluster_pair_similarities[pair_key] = {
                'similarities': [],
                'count': 0
            }
        
        cluster_pair_similarities[pair_key]['similarities'].append(edge['similarity'])
        cluster_pair_similarities[pair_key]['count'] += 1
    
    # Create cluster edges with aggregated metrics
    cluster_edges = []
    for (source, target), data in cluster_pair_similarities.items():
        avg_similarity = sum(data['similarities']) / len(data['similarities'])
        max_similarity = max(data['similarities'])
        
        cluster_edges.append({
            'source': source,
            'target': target,
            'similarity': round(avg_similarity, 3),
            'max_similarity': round(max_similarity, 3),
            'connection_count': data['count'],
            'type': 'cluster_connection'
        })
    
    return cluster_edges


@router.get(
    "/topic-network",
    summary="Get topic network graph data",
    description="""
    Returns pre-computed graph data showing topic similarities across standards.
    
    The graph consists of:
    - **Nodes**: Sections from all three standards
    - **Edges**: Cross-standard similarity connections
    - **Clusters**: Topic groups discovered through K-means clustering
    
    Query parameters allow filtering the graph for better visualization.
    """,
    response_description="Graph data with nodes, edges, and clusters"
)
async def get_topic_network(
    similarity_threshold: float = Query(
        default=0.6,
        ge=0.5,
        le=0.8,
        description="Minimum similarity score for edges (0.5-0.8)"
    ),
    view_mode: str = Query(
        default="clusters",
        regex="^(clusters|sections)$",
        description="View mode: 'clusters' for topic view, 'sections' for detailed view"
    ),
    standards: Optional[str] = Query(
        default=None,
        description="Comma-separated list of standards to include (e.g., 'PMBOK,PRINCE2')"
    )
):
    """
    Get topic network graph data for visualization.
    
    Args:
        similarity_threshold: Minimum similarity score for displaying edges
        view_mode: Display mode (clusters or sections)
        standards: Filter by specific standards (comma-separated)
    
    Returns:
        Graph data with nodes, edges, clusters, and metadata
    """
    try:
        # Load graph data
        graph_data = load_graph_data()
        
        # Parse standards filter
        standards_list = None
        if standards:
            standards_list = [s.strip() for s in standards.upper().split(',')]
            valid_standards = {'PMBOK', 'PRINCE2', 'ISO_21502'}
            standards_list = [s for s in standards_list if s in valid_standards]
            
            if not standards_list:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid standards filter. Use: PMBOK, PRINCE2, ISO_21502"
                )
        
        # Filter graph data
        filtered_data = filter_graph_data(
            graph_data,
            similarity_threshold,
            view_mode,
            standards_list
        )
        
        logger.info(
            f"Graph data served: {len(filtered_data['nodes'])} nodes, "
            f"{len(filtered_data['edges'])} edges, "
            f"threshold={similarity_threshold}, mode={view_mode}"
        )
        
        return JSONResponse(content=filtered_data)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving graph data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve graph data: {str(e)}"
        )


@router.get(
    "/clusters/{cluster_id}",
    summary="Get cluster details",
    description="Get detailed information about a specific topic cluster including all member sections",
    response_description="Cluster details with member sections"
)
async def get_cluster_details(cluster_id: str):
    """
    Get detailed information about a specific cluster.
    
    Args:
        cluster_id: Cluster identifier (e.g., 'cluster_0')
    
    Returns:
        Cluster metadata and member sections
    """
    try:
        graph_data = load_graph_data()
        
        # Find cluster
        cluster = next(
            (c for c in graph_data['clusters'] if c['id'] == cluster_id),
            None
        )
        
        if not cluster:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cluster '{cluster_id}' not found"
            )
        
        # Get member sections
        members = [
            n for n in graph_data['nodes']
            if n.get('cluster_id') == cluster_id
        ]
        
        # Get connections within cluster
        member_ids = set(m['id'] for m in members)
        connections = [
            e for e in graph_data['edges']
            if e['source'] in member_ids or e['target'] in member_ids
        ]
        
        result = {
            'cluster': cluster,
            'members': members,
            'connections': connections,
            'member_count': len(members),
            'connection_count': len(connections)
        }
        
        logger.info(f"Cluster details served: {cluster_id} ({len(members)} members)")
        return JSONResponse(content=result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cluster details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cluster details: {str(e)}"
        )


@router.get(
    "/stats",
    summary="Get graph statistics",
    description="Get overall statistics about the topic network graph",
    response_description="Graph statistics and metrics"
)
async def get_graph_stats():
    """
    Get overall graph statistics.
    
    Returns:
        Statistics including node counts, edge counts, cluster info, etc.
    """
    try:
        graph_data = load_graph_data()
        
        # Calculate statistics
        standards_dist = {}
        for node in graph_data['nodes']:
            std = node['standard']
            standards_dist[std] = standards_dist.get(std, 0) + 1
        
        cluster_sizes = [c['size'] for c in graph_data['clusters']]
        
        stats = {
            'total_nodes': len(graph_data['nodes']),
            'total_edges': len(graph_data['edges']),
            'total_clusters': len(graph_data['clusters']),
            'standards_distribution': standards_dist,
            'cluster_stats': {
                'min_size': min(cluster_sizes) if cluster_sizes else 0,
                'max_size': max(cluster_sizes) if cluster_sizes else 0,
                'avg_size': sum(cluster_sizes) / len(cluster_sizes) if cluster_sizes else 0
            },
            'edge_stats': {
                'avg_similarity': sum(e['similarity'] for e in graph_data['edges']) / len(graph_data['edges']) if graph_data['edges'] else 0,
                'min_similarity': min(e['similarity'] for e in graph_data['edges']) if graph_data['edges'] else 0,
                'max_similarity': max(e['similarity'] for e in graph_data['edges']) if graph_data['edges'] else 0
            },
            'metadata': graph_data['metadata']
        }
        
        return JSONResponse(content=stats)
    
    except Exception as e:
        logger.error(f"Error getting graph stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get graph stats: {str(e)}"
        )


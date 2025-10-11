"""
Generate Topic Clusters and Graph Data for Network Visualization

This script:
1. Fetches all sections with embeddings from PostgreSQL
2. Applies K-means clustering to discover topic groups
3. Computes cross-standard similarities using Qdrant
4. Generates graph_data.json for frontend visualization
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sqlalchemy import text
from collections import defaultdict, Counter

# Load environment from ROOT .env file
from dotenv import load_dotenv
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / '.env'
load_dotenv(env_path)
print(f"📍 Loading environment from: {env_path}")

# Add backend directory to path (works with root venv)
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.db.database import get_db
from app.services.qdrant_service import get_qdrant_service

# Configuration
MIN_CLUSTERS = 15
MAX_CLUSTERS = 35
SIMILARITY_THRESHOLD = 0.5
TOP_K_SIMILAR = 10

# Standard colors
STANDARD_COLORS = {
    'PMBOK': '#3b82f6',
    'PRINCE2': '#a855f7',
    'ISO_21502': '#14b8a6'
}


def fetch_sections_with_embeddings(db_session) -> Tuple[List[Dict], np.ndarray]:
    """Fetch all sections with embeddings from database"""
    print("📊 Fetching sections with embeddings from database...")
    
    query = text("""
        SELECT
            id::text,
            standard::text,
            section_number,
            section_title,
            page_start,
            page_end,
            content_cleaned,
            embedding
        FROM document_sections
        WHERE embedding IS NOT NULL
        ORDER BY standard, section_number
    """)
    
    rows = db_session.execute(query).fetchall()
    
    sections = []
    embeddings = []
    
    for row in rows:
        # Convert embedding from pgvector string format to numpy array
        embedding_str = row[7]
        if isinstance(embedding_str, str):
            embedding = np.array([float(x) for x in embedding_str.strip('[]').split(',')])
        else:
            embedding = np.array(embedding_str)
        
        sections.append({
            'id': row[0],
            'standard': row[1],
            'section_number': row[2],
            'section_title': row[3],
            'page_start': row[4],
            'page_end': row[5],
            'content_cleaned': row[6]
        })
        embeddings.append(embedding)
    
    print(f"✅ Loaded {len(sections)} sections with embeddings")
    return sections, np.array(embeddings)


def find_optimal_clusters(embeddings: np.ndarray, min_k: int, max_k: int) -> int:
    """Find optimal number of clusters using Elbow method and Silhouette score"""
    print(f"\n🔍 Finding optimal number of clusters (testing {min_k}-{max_k})...")
    
    inertias = []
    silhouette_scores = []
    k_range = range(min_k, max_k + 1)
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        inertias.append(kmeans.inertia_)
        
        # Calculate silhouette score (skip if k is too large)
        if k < len(embeddings) - 1:
            score = silhouette_score(embeddings, labels)
            silhouette_scores.append(score)
            print(f"  k={k}: inertia={kmeans.inertia_:.2f}, silhouette={score:.3f}")
        else:
            silhouette_scores.append(0)
    
    # Find k with best silhouette score
    optimal_k = k_range[np.argmax(silhouette_scores)]
    print(f"✅ Optimal k={optimal_k} (silhouette score: {max(silhouette_scores):.3f})")
    
    return optimal_k


def perform_clustering(sections: List[Dict], embeddings: np.ndarray, k: int) -> Tuple[np.ndarray, KMeans]:
    """Perform K-means clustering on embeddings"""
    print(f"\n🎯 Performing K-means clustering with k={k}...")
    
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    # Add cluster labels to sections
    for i, section in enumerate(sections):
        section['cluster_id'] = int(labels[i])
    
    print(f"✅ Clustering complete")
    return labels, kmeans


def generate_cluster_metadata(sections: List[Dict], labels: np.ndarray) -> List[Dict]:
    """Generate metadata for each cluster"""
    print("\n📋 Generating cluster metadata...")
    
    clusters = []
    cluster_sections = defaultdict(list)
    
    # Group sections by cluster
    for section in sections:
        cluster_sections[section['cluster_id']].append(section)
    
    # Generate metadata for each cluster
    for cluster_id in sorted(cluster_sections.keys()):
        cluster_members = cluster_sections[cluster_id]
        
        # Count standards in cluster
        standards = [s['standard'] for s in cluster_members]
        standard_counts = Counter(standards)
        
        # Find representative section (most central - first in cluster for simplicity)
        representative = cluster_members[0]
        
        # Generate cluster name from most common words in titles
        titles = ' '.join([s['section_title'] for s in cluster_members[:5]])
        cluster_name = generate_cluster_name(titles, cluster_id)
        
        # Assign color based on dominant standard
        dominant_standard = max(standard_counts.items(), key=lambda x: x[1])[0]
        color = STANDARD_COLORS.get(dominant_standard, '#6b7280')
        
        clusters.append({
            'id': f'cluster_{cluster_id}',
            'name': cluster_name,
            'size': len(cluster_members),
            'standards': list(standard_counts.keys()),
            'standard_counts': dict(standard_counts),
            'representative_section_id': representative['id'],
            'color': color
        })
    
    print(f"✅ Generated metadata for {len(clusters)} clusters")
    return clusters


def generate_cluster_name(titles: str, cluster_id: int) -> str:
    """Generate a meaningful cluster name from section titles"""
    # Simple keyword extraction (in production, could use TF-IDF or NLP)
    common_words = {'project', 'management', 'and', 'the', 'of', 'in', 'for', 'to', 'a', 'an'}
    
    words = titles.lower().split()
    word_counts = Counter([w for w in words if w not in common_words and len(w) > 3])
    
    if word_counts:
        top_words = [word.capitalize() for word, _ in word_counts.most_common(3)]
        return ' & '.join(top_words[:2]) if len(top_words) >= 2 else top_words[0]
    
    return f'Topic Cluster {cluster_id}'


def compute_cross_standard_similarities(sections: List[Dict]) -> List[Dict]:
    """Compute cross-standard similarities using Qdrant"""
    print("\n🔗 Computing cross-standard similarities...")
    
    qdrant_service = get_qdrant_service()
    edges = []
    processed_pairs = set()
    
    for i, section in enumerate(sections):
        if i % 50 == 0:
            print(f"  Progress: {i}/{len(sections)} sections processed")
        
        section_id = section['id']
        section_standard = section['standard']
        
        # Get embedding (need to fetch from Qdrant or reconstruct)
        # For now, we'll query Qdrant for similar sections
        try:
            # Search for similar sections across all standards
            results = qdrant_service.search(
                query_vector=None,  # Will need to get from point
                limit=TOP_K_SIMILAR + 5,  # Extra to filter
                score_threshold=SIMILARITY_THRESHOLD
            )
            
            # This won't work directly - we need the embedding
            # Alternative: use PostgreSQL vector similarity
            continue
            
        except Exception as e:
            print(f"  Warning: Could not process section {section_id}: {e}")
            continue
    
    print(f"  Note: Using alternative approach for similarity computation...")
    return compute_similarities_from_db(sections)


def compute_similarities_from_db(sections: List[Dict]) -> List[Dict]:
    """Compute similarities using PostgreSQL vector operations"""
    print("\n🔗 Computing similarities using PostgreSQL...")
    
    edges = []
    processed_pairs = set()
    
    db_session = next(get_db())
    
    for i, section in enumerate(sections):
        if i % 20 == 0:
            print(f"  Progress: {i}/{len(sections)} sections processed")
        
        section_id = section['id']
        section_standard = section['standard']
        
        # Find similar sections from OTHER standards
        query = text("""
            SELECT
                s2.id::text,
                s2.standard::text,
                1 - (s1.embedding <=> s2.embedding) as similarity
            FROM document_sections s1
            CROSS JOIN document_sections s2
            WHERE s1.id::text = :section_id
                AND s2.standard::text != :standard
                AND s1.embedding IS NOT NULL
                AND s2.embedding IS NOT NULL
                AND 1 - (s1.embedding <=> s2.embedding) >= :threshold
            ORDER BY similarity DESC
            LIMIT :limit
        """)
        
        try:
            results = db_session.execute(query, {
                'section_id': section_id,
                'standard': section_standard,
                'threshold': SIMILARITY_THRESHOLD,
                'limit': TOP_K_SIMILAR
            }).fetchall()
            
            for row in results:
                target_id = row[0]
                target_standard = row[1]
                similarity = float(row[2])
                
                # Create unique pair key (sorted to avoid duplicates)
                pair_key = tuple(sorted([section_id, target_id]))
                
                if pair_key not in processed_pairs:
                    processed_pairs.add(pair_key)
                    edges.append({
                        'source': section_id,
                        'target': target_id,
                        'similarity': round(similarity, 3),
                        'type': 'cross_standard'
                    })
        
        except Exception as e:
            print(f"  Warning: Error processing {section_id}: {e}")
            continue
    
    db_session.close()
    print(f"✅ Generated {len(edges)} cross-standard connections")
    return edges


def generate_graph_data(sections: List[Dict], clusters: List[Dict], edges: List[Dict]) -> Dict:
    """Generate final graph data structure"""
    print("\n📦 Generating graph data structure...")
    
    # Prepare nodes (all sections)
    nodes = []
    for section in sections:
        nodes.append({
            'id': section['id'],
            'standard': section['standard'],
            'section_number': section['section_number'],
            'section_title': section['section_title'],
            'cluster_id': f"cluster_{section['cluster_id']}",
            'page_start': section['page_start'],
            'page_end': section.get('page_end')
        })
    
    # Calculate statistics
    standard_counts = Counter([n['standard'] for n in nodes])
    
    graph_data = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'total_clusters': len(clusters),
            'similarity_threshold': SIMILARITY_THRESHOLD,
            'standards': dict(standard_counts)
        },
        'clusters': clusters,
        'nodes': nodes,
        'edges': edges
    }
    
    print(f"✅ Graph data generated:")
    print(f"   - {len(nodes)} nodes")
    print(f"   - {len(edges)} edges")
    print(f"   - {len(clusters)} clusters")
    
    return graph_data


def save_graph_data(graph_data: Dict, output_path: str):
    """Save graph data to JSON file"""
    print(f"\n💾 Saving graph data to {output_path}...")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(graph_data, f, indent=2)
    
    print(f"✅ Graph data saved successfully")
    
    # Print file size
    file_size = os.path.getsize(output_path)
    print(f"   File size: {file_size / 1024:.2f} KB")


def main():
    """Main execution function"""
    print("=" * 60)
    print("🚀 Topic Clustering & Graph Generation")
    print("=" * 60)
    
    # Get database session
    db_session = next(get_db())
    
    try:
        # Step 1: Fetch sections with embeddings
        sections, embeddings = fetch_sections_with_embeddings(db_session)
        
        # Step 2: Find optimal number of clusters
        optimal_k = find_optimal_clusters(embeddings, MIN_CLUSTERS, MAX_CLUSTERS)
        
        # Step 3: Perform clustering
        labels, kmeans = perform_clustering(sections, embeddings, optimal_k)
        
        # Step 4: Generate cluster metadata
        clusters = generate_cluster_metadata(sections, labels)
        
        # Step 5: Compute cross-standard similarities
        edges = compute_similarities_from_db(sections)
        
        # Step 6: Generate graph data
        graph_data = generate_graph_data(sections, clusters, edges)
        
        # Step 7: Save to file
        output_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'data',
            'graph_data.json'
        )
        save_graph_data(graph_data, output_path)
        
        print("\n" + "=" * 60)
        print("✨ Graph generation complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during graph generation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        db_session.close()


if __name__ == '__main__':
    main()


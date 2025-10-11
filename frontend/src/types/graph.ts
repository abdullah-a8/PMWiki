/**
 * Graph visualization types for topic network
 */

export type StandardType = 'PMBOK' | 'PRINCE2' | 'ISO_21502';

export type ViewMode = 'clusters' | 'sections';

export type EdgeType = 'cross_standard' | 'within_standard' | 'cluster_connection';

export interface GraphNode {
  id: string;
  standard: StandardType;
  section_number: string;
  section_title: string;
  cluster_id?: string;
  page_start: number;
  page_end?: number | null;
}

// Cluster node for aggregated view
export interface ClusterNode {
  id: string;
  type: 'cluster';
  name: string;
  size: number;
  original_size: number;
  standards: StandardType[];
  standard_counts: Record<string, number>;
  color: string;
  representative_section_id?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
  type: EdgeType;
  max_similarity?: number;
  connection_count?: number;
}

export interface ClusterInfo {
  id: string;
  name: string;
  size: number;
  standards: StandardType[];
  standard_counts: Record<StandardType, number>;
  representative_section_id: string;
  color: string;
}

export interface GraphMetadata {
  generated_at: string;
  total_nodes: number;
  total_edges: number;
  total_clusters: number;
  similarity_threshold: number;
  standards: Record<StandardType, number>;
  filtered?: boolean;
  filter_params?: {
    similarity_threshold: number;
    view_mode: ViewMode;
    standards: StandardType[] | null;
  };
  filtered_nodes?: number;
  filtered_edges?: number;
}

export interface GraphData {
  metadata: GraphMetadata;
  clusters: ClusterInfo[];
  nodes: (GraphNode | ClusterNode)[];
  edges: GraphEdge[];
}

export interface GraphParams {
  similarity_threshold?: number;
  view_mode?: ViewMode;
  standards?: string;
}

export interface ClusterDetails {
  cluster: ClusterInfo;
  members: GraphNode[];
  connections: GraphEdge[];
  member_count: number;
  connection_count: number;
}

export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  total_clusters: number;
  standards_distribution: Record<StandardType, number>;
  cluster_stats: {
    min_size: number;
    max_size: number;
    avg_size: number;
  };
  edge_stats: {
    avg_similarity: number;
    min_similarity: number;
    max_similarity: number;
  };
  metadata: GraphMetadata;
}

// React Flow types
export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    standard: StandardType;
    section_number: string;
    section_title: string;
    cluster_id?: string;
    page_start: number;
    connectionCount?: number;
  };
  style?: React.CSSProperties;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  label?: string;
  data?: {
    similarity: number;
    type: EdgeType;
  };
}


import { useCallback, useEffect, useMemo, memo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Panel,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphNode, GraphEdge, StandardType, ClusterNode } from '@/types/graph';
import { Badge } from '@/components/ui/badge';

interface TopicNetworkGraphProps {
  nodes: (GraphNode | ClusterNode)[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  standardFilters: Set<StandardType>;
}

// Standard colors
const STANDARD_COLORS: Record<StandardType, string> = {
  PMBOK: '#3b82f6',
  PRINCE2: '#a855f7',
  ISO_21502: '#14b8a6',
};

// Section Node Component - Individual sections
const SectionNode = memo(({ data }: { data: any }) => {
  const color = STANDARD_COLORS[data.standard as StandardType];
  
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 bg-background shadow-lg hover:shadow-xl transition-shadow"
      style={{ borderColor: color, minWidth: '200px' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge
          variant="outline"
          className="text-xs shrink-0"
          style={{
            borderColor: color,
            color: color,
            backgroundColor: `${color}10`,
          }}
        >
          {data.standard === 'ISO_21502' ? 'ISO 21502' : data.standard}
        </Badge>
        {data.connectionCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {data.connectionCount} links
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold leading-tight line-clamp-2">
          {data.section_title}
        </p>
        <p className="text-xs text-muted-foreground">§ {data.section_number}</p>
      </div>
    </div>
  );
});

SectionNode.displayName = 'SectionNode';

// Cluster Node Component - Topic groups
const ClusterNode = memo(({ data }: { data: any }) => {
  const color = data.color || '#6b7280';
  const standardBadges = data.standards || [];
  
  return (
    <div
      className="px-5 py-4 rounded-xl border-2 bg-background shadow-xl hover:shadow-2xl transition-all"
      style={{ 
        borderColor: color, 
        minWidth: '280px',
        background: `linear-gradient(135deg, ${color}08 0%, ${color}04 100%)`
      }}
    >
      <div className="space-y-3">
        {/* Header with size badge */}
        <div className="flex items-start justify-between gap-2">
          <Badge
            variant="secondary"
            className="text-xs font-semibold"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              borderColor: color,
            }}
          >
            {data.size} section{data.size !== 1 ? 's' : ''}
          </Badge>
          {data.connectionCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {data.connectionCount} links
            </span>
          )}
        </div>
        
        {/* Cluster name */}
        <div>
          <p className="text-lg font-bold leading-tight text-foreground">
            {data.name}
          </p>
        </div>
        
        {/* Standards badges */}
        <div className="flex flex-wrap gap-1.5">
          {standardBadges.map((std: string) => {
            const stdColor = STANDARD_COLORS[std as StandardType] || '#6b7280';
            return (
              <Badge
                key={std}
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: stdColor,
                  color: stdColor,
                  backgroundColor: `${stdColor}10`,
                }}
              >
                {std === 'ISO_21502' ? 'ISO 21502' : std}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ClusterNode.displayName = 'ClusterNode';

const nodeTypes = {
  section: SectionNode,
  cluster: ClusterNode,
};

export const TopicNetworkGraph = memo(function TopicNetworkGraph({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
  selectedNodeId,
  standardFilters,
}: TopicNetworkGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Calculate connection counts for each node
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graphEdges.forEach((edge) => {
      counts[edge.source] = (counts[edge.source] || 0) + 1;
      counts[edge.target] = (counts[edge.target] || 0) + 1;
    });
    return counts;
  }, [graphEdges]);

  // Convert graph data to React Flow format
  useEffect(() => {
    // Determine if nodes are clusters or sections based on type field
    const isClusterView = graphNodes.length > 0 && 'type' in graphNodes[0] && graphNodes[0].type === 'cluster';
    
    if (isClusterView) {
      // Cluster view: render cluster nodes
      const clusterNodes = graphNodes as ClusterNode[];
      
      // Filter by standards
      const filteredClusters = clusterNodes.filter((cluster) =>
        cluster.standards.some((std) => standardFilters.has(std))
      );
      
      // Create layout for clusters
      const layoutNodes = createClusterLayout(filteredClusters);
      
      // Convert to React Flow nodes
      const reactFlowNodes: Node[] = layoutNodes.map((cluster) => ({
        id: cluster.id,
        type: 'cluster',
        position: cluster.position,
        data: {
          label: cluster.name,
          name: cluster.name,
          size: cluster.size,
          standards: cluster.standards,
          color: cluster.color,
          connectionCount: connectionCounts[cluster.id] || 0,
        },
        style: {
          opacity: selectedNodeId && selectedNodeId !== cluster.id ? 0.4 : 1,
        },
      }));
      
      setNodes(reactFlowNodes);
    } else {
      // Section view: render individual section nodes
      const sectionNodes = graphNodes as GraphNode[];
      
      // Filter nodes by standard
      const filteredNodes = sectionNodes.filter((node) =>
        standardFilters.has(node.standard)
      );

      // Use simple cluster-based layout (non-blocking)
      const layoutNodes = createClusterLayout(filteredNodes);

      // Convert to React Flow nodes
      const reactFlowNodes: Node[] = layoutNodes.map((node) => ({
        id: node.id,
        type: 'section',
        position: node.position,
        data: {
          label: node.section_title,
          standard: node.standard,
          section_number: node.section_number,
          section_title: node.section_title,
          cluster_id: node.cluster_id,
          page_start: node.page_start,
          connectionCount: connectionCounts[node.id] || 0,
        },
        style: {
          opacity: selectedNodeId && selectedNodeId !== node.id ? 0.4 : 1,
        },
      }));

      setNodes(reactFlowNodes);
    }

    // Convert to React Flow edges - limit edge rendering for performance
    const nodeIds = new Set(graphNodes.map((n) => n.id));
    const filteredEdges = graphEdges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

    const reactFlowEdges: Edge[] = filteredEdges.map((edge, idx) => {
      const isClusterEdge = edge.type === 'cluster_connection';
      
      return {
        id: `${edge.source}-${edge.target}-${idx}`,
        source: String(edge.source),
        target: String(edge.target),
        type: 'default',
        animated: edge.similarity > 0.8,
        label: isClusterEdge && edge.connection_count ? `${edge.connection_count}` : undefined,
        style: {
          stroke: edge.similarity > 0.7 ? '#8b5cf6' : '#64748b',
          strokeWidth: isClusterEdge 
            ? Math.max(2, Math.min(8, (edge.connection_count || 1) * 0.5))
            : Math.max(1.5, edge.similarity * 4),
          opacity: 0.6,
        },
        data: {
          similarity: edge.similarity,
          type: edge.type,
          connection_count: edge.connection_count,
        },
      };
    });

    setEdges(reactFlowEdges);
  }, [graphNodes, graphEdges, standardFilters, selectedNodeId, connectionCounts, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node.id);
      }
    },
    [onNodeClick]
  );

  // Handle ReactFlow initialization - fit view only once on mount
  const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
    // Fit view on initial load with animation disabled for better performance
    reactFlowInstance.fitView({ 
      padding: 0.2,
      duration: 0, // No animation on init for instant display
    });
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={handleNodeClick}
        onInit={onInit}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        minZoom={0.05}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        edgesFocusable={false}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node): string => {
            // Cluster nodes have a color property
            if (node.data.color) {
              return node.data.color as string;
            }
            // Section nodes have a standard property
            const standard = node.data.standard as StandardType;
            return STANDARD_COLORS[standard] || '#6b7280';
          }}
          pannable
          zoomable
        />
        <Panel position="top-right" className="bg-background/95 backdrop-blur-md p-4 rounded-lg border border-border/50 shadow-lg">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground mb-3">Legend</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STANDARD_COLORS.PMBOK }} />
                <span className="text-xs text-foreground">PMBOK</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STANDARD_COLORS.PRINCE2 }} />
                <span className="text-xs text-foreground">PRINCE2</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STANDARD_COLORS.ISO_21502 }} />
                <span className="text-xs text-foreground">ISO 21502</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
});

// Fast cluster-based layout - groups nodes by cluster and standard
function createClusterLayout<T extends GraphNode | ClusterNode>(
  nodes: T[]
): (T & { position: { x: number; y: number } })[] {
  // For cluster nodes, use simple grid layout
  if (nodes.length > 0 && 'type' in nodes[0] && nodes[0].type === 'cluster') {
    const nodePositions: (T & { position: { x: number; y: number } })[] = [];
    const spacing = 450;
    const nodesPerRow = 4;
    
    nodes.forEach((node, idx) => {
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;
      
      nodePositions.push({
        ...node,
        position: {
          x: col * spacing,
          y: row * spacing,
        },
      });
    });
    
    return nodePositions;
  }
  
  // For section nodes, group by cluster_id
  const sectionNodes = nodes as GraphNode[];
  const clusters = new Map<string, GraphNode[]>();
  
  sectionNodes.forEach((node) => {
    const clusterId = node.cluster_id ?? 'unclustered';
    if (!clusters.has(clusterId)) {
      clusters.set(clusterId, []);
    }
    clusters.get(clusterId)!.push(node);
  });

  const nodePositions: any[] = [];
  
  // Layout parameters for sections
  const clusterSpacing = 400;
  const nodeSpacing = 280;
  const nodesPerRow = 4;
  
  let clusterIndex = 0;
  
  clusters.forEach((clusterNodes) => {
    // Calculate cluster position
    const clusterRow = Math.floor(clusterIndex / 3);
    const clusterCol = clusterIndex % 3;
    const clusterX = clusterCol * clusterSpacing * nodesPerRow;
    const clusterY = clusterRow * clusterSpacing * Math.ceil(clusterNodes.length / nodesPerRow);
    
    // Position nodes within cluster
    clusterNodes.forEach((node, idx) => {
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;
      
      nodePositions.push({
        ...node,
        position: {
          x: clusterX + col * nodeSpacing,
          y: clusterY + row * nodeSpacing,
        },
      });
    });
    
    clusterIndex++;
  });

  return nodePositions;
}


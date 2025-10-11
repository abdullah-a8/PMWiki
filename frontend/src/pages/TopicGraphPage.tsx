import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, Loader2, AlertCircle } from 'lucide-react';
import { graphApi } from '@/lib/api';
import { TopicNetworkGraph } from '@/components/graph/TopicNetworkGraph';
import { GraphControls } from '@/components/graph/GraphControls';
import { NodeDetailPanel } from '@/components/graph/NodeDetailPanel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import type { StandardType, ViewMode } from '@/types/graph';

export function TopicGraphPage() {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [viewMode, setViewMode] = useState<ViewMode>('clusters');
  const [standardFilters, setStandardFilters] = useState<Set<StandardType>>(
    new Set(['PMBOK', 'PRINCE2', 'ISO_21502'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Fetch graph data - queryKey automatically triggers refetch when dependencies change
  const {
    data: graphData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['graph-data', similarityThreshold, viewMode],
    queryFn: async () => {
      const response = await graphApi.getTopicNetwork({
        similarity_threshold: similarityThreshold,
        view_mode: viewMode,
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Filter nodes by search query
  const filteredNodes = useMemo(() => {
    if (!graphData?.nodes) return [];
    
    let nodes = graphData.nodes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(
        (node) =>
          node.section_title.toLowerCase().includes(query) ||
          node.section_number.toLowerCase().includes(query) ||
          node.standard.toLowerCase().includes(query)
      );
    }

    return nodes;
  }, [graphData?.nodes, searchQuery]);

  // Filter edges based on filtered nodes
  const filteredEdges = useMemo(() => {
    if (!graphData?.edges) return [];
    
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return graphData.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [graphData?.edges, filteredNodes]);

  // Get selected node
  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !filteredNodes) return null;
    return filteredNodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, filteredNodes]);
  
  // Get all nodes from graph data for detail panel
  const allGraphNodes = useMemo(() => {
    return graphData?.nodes || [];
  }, [graphData]);

  // Get connections for selected node
  const selectedNodeConnections = useMemo(() => {
    if (!selectedNodeId || !filteredEdges) return [];
    return filteredEdges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId
    );
  }, [selectedNodeId, filteredEdges]);

  const handleStandardFilterToggle = useCallback((standard: StandardType) => {
    setStandardFilters((prev) => {
      const newFilters = new Set(prev);
      if (newFilters.has(standard)) {
        newFilters.delete(standard);
      } else {
        newFilters.add(standard);
      }
      return newFilters;
    });
    setSelectedNodeId(null); // Clear selection when filters change
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (nodeId === prev ? null : nodeId));
  }, []);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header - Centered design matching other pages */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Centered Title Section */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 mb-1">
              <Network className="h-6 w-6 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">Topic Network</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Explore connections across PM standards
            </p>
          </div>

          {/* Search bar without background card - integrated controls */}
          <div className="max-w-2xl mx-auto">
            <GraphControls
              similarityThreshold={similarityThreshold}
              onSimilarityThresholdChange={setSimilarityThreshold}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              standardFilters={standardFilters}
              onStandardFilterToggle={handleStandardFilterToggle}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              nodeCount={filteredNodes.length}
              edgeCount={filteredEdges.length}
            />
          </div>
        </div>
      </div>

       {/* Graph Canvas Container */}
       <div className="flex-1 relative px-4 pb-4">
         <div className="max-w-7xl mx-auto h-full">
           {/* Fixed-size container with glassmorphism styling matching design system */}
           <div className="h-full rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl overflow-hidden">
             {/* 
               Graph canvas wrapper with GPU layering for smooth animations
               - transform: translateZ(0): Creates GPU-accelerated layer
               - will-change: transform: Optimizes for sidebar animation
               This allows smooth sidebar animation while minimizing ReactFlow recalculations
             */}
             <div 
               className="relative w-full h-full" 
               style={{ 
                 transform: 'translateZ(0)',
                 willChange: 'transform'
               }}
             >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <Card className="p-6">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading graph data...</p>
                    </div>
                  </Card>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <Alert variant="destructive" className="max-w-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load graph data. Please try again later.
                      {error instanceof Error && (
                        <p className="mt-2 text-xs">{error.message}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {!isLoading && !error && graphData && filteredNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Card className="p-8 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery
                        ? 'Try adjusting your search query or filters'
                        : 'No nodes match the current filters'}
                    </p>
                  </Card>
                </div>
              )}

              {!isLoading && !error && graphData && filteredNodes.length > 0 && (
                <>
                  <TopicNetworkGraph
                    nodes={filteredNodes}
                    edges={filteredEdges}
                    onNodeClick={handleNodeClick}
                    selectedNodeId={selectedNodeId}
                    standardFilters={standardFilters}
                  />

                  <NodeDetailPanel
                    node={selectedNode}
                    connections={selectedNodeConnections}
                    allNodes={allGraphNodes}
                    onClose={() => setSelectedNodeId(null)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


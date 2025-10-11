import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, GitCompare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { GraphNode, GraphEdge, StandardType, ClusterNode } from '@/types/graph';

interface NodeDetailPanelProps {
  node: GraphNode | ClusterNode | null;
  connections: GraphEdge[];
  allNodes: (GraphNode | ClusterNode)[];
  onClose: () => void;
}

const STANDARD_COLORS: Record<StandardType, string> = {
  PMBOK: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PRINCE2: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  ISO_21502: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
};

export const NodeDetailPanel = memo(function NodeDetailPanel({
  node,
  connections,
  allNodes,
  onClose,
}: NodeDetailPanelProps) {
  const navigate = useNavigate();

  if (!node) {
    return null;
  }

  const getStandardDisplay = (std: StandardType) => {
    return std === 'ISO_21502' ? 'ISO 21502' : std;
  };

  // Check if this is a cluster node
  const isCluster = 'type' in node && node.type === 'cluster';

  // Get connected nodes
  const connectedNodes = connections
    .map((edge) => {
      const targetId = edge.source === node.id ? edge.target : edge.source;
      const targetNode = allNodes.find((n) => n.id === targetId);
      return targetNode ? { 
        node: targetNode, 
        similarity: edge.similarity,
        connectionCount: edge.connection_count 
      } : null;
    })
    .filter((item): item is { node: GraphNode | ClusterNode; similarity: number; connectionCount: number | undefined } => item !== null)
    .sort((a, b) => b.similarity - a.similarity);

  return (
    <>
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>

      <Card className="absolute right-4 top-4 bottom-4 w-96 flex flex-col shadow-2xl overflow-hidden">
      <CardHeader className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-8 w-8 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        {isCluster ? (
          // Cluster node header
          <>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(node as ClusterNode).standards.map((std) => (
                <Badge
                  key={std}
                  variant="outline"
                  className={`text-xs ${STANDARD_COLORS[std as StandardType]}`}
                >
                  {getStandardDisplay(std as StandardType)}
                </Badge>
              ))}
            </div>
            <CardTitle className="text-lg leading-tight pr-8">
              {(node as ClusterNode).name}
            </CardTitle>
            <CardDescription>
              Topic Cluster • {(node as ClusterNode).size} sections
            </CardDescription>
          </>
        ) : (
          // Section node header
          <>
            <Badge
              variant="outline"
              className={`w-fit mb-2 ${STANDARD_COLORS[(node as GraphNode).standard]}`}
            >
              {getStandardDisplay((node as GraphNode).standard)}
            </Badge>
            <CardTitle className="text-lg leading-tight pr-8">
              {(node as GraphNode).section_title}
            </CardTitle>
            <CardDescription>Section {(node as GraphNode).section_number}</CardDescription>
          </>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 overflow-y-auto pt-4 space-y-4 custom-scrollbar">
        {/* Metadata */}
        <div className="space-y-2 text-sm">
          {isCluster ? (
            // Cluster metadata
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sections</span>
                <span className="font-mono">{(node as ClusterNode).size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-mono">{connections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standards</span>
                <span className="font-mono">{(node as ClusterNode).standards.length}</span>
              </div>
            </>
          ) : (
            // Section metadata
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Page</span>
                <span className="font-mono">
                  {(node as GraphNode).page_start}
                  {(node as GraphNode).page_end && (node as GraphNode).page_end !== (node as GraphNode).page_start
                    ? `-${(node as GraphNode).page_end}`
                    : ''}
                </span>
              </div>
              {(node as GraphNode).cluster_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cluster</span>
                  <span className="font-mono text-xs">{(node as GraphNode).cluster_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-mono">{connections.length}</span>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Actions */}
        {!isCluster && (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate(`/sections/${node.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Library
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                // Navigate to compare page with this section
                navigate(`/compare?section=${node.id}`);
              }}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Similar
            </Button>
          </div>
        )}

        {/* Connected Nodes */}
        {connectedNodes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">
                {isCluster ? `Connected Topics (${connectedNodes.length})` : `Similar Sections (${connectedNodes.length})`}
              </h4>
              <div className="space-y-2">
                {connectedNodes.map(({ node: connectedNode, similarity, connectionCount }) => {
                  const isConnectedCluster = 'type' in connectedNode && connectedNode.type === 'cluster';
                  
                  return (
                    <div
                      key={connectedNode.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (!isConnectedCluster) {
                          navigate(`/sections/${connectedNode.id}`);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        {isConnectedCluster ? (
                          <div className="flex flex-wrap gap-1">
                            {(connectedNode as ClusterNode).standards.slice(0, 2).map((std) => (
                              <Badge
                                key={std}
                                variant="outline"
                                className={`text-xs ${STANDARD_COLORS[std as StandardType]}`}
                              >
                                {getStandardDisplay(std as StandardType)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-xs ${STANDARD_COLORS[(connectedNode as GraphNode).standard]}`}
                          >
                            {getStandardDisplay((connectedNode as GraphNode).standard)}
                          </Badge>
                        )}
                        <span className="text-xs font-mono text-muted-foreground">
                          {isCluster && connectionCount ? `${connectionCount} links` : `${(similarity * 100).toFixed(0)}%`}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">
                        {isConnectedCluster 
                          ? (connectedNode as ClusterNode).name
                          : (connectedNode as GraphNode).section_title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isConnectedCluster 
                          ? `${(connectedNode as ClusterNode).size} sections`
                          : `§ ${(connectedNode as GraphNode).section_number}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
});


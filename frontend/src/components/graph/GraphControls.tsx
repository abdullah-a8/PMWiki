import { useState } from 'react';
import { Search, Sliders, X, RotateCcw, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { StandardType, ViewMode } from '@/types/graph';

interface GraphControlsProps {
  similarityThreshold: number;
  onSimilarityThresholdChange: (value: number) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  standardFilters: Set<StandardType>;
  onStandardFilterToggle: (standard: StandardType) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  nodeCount: number;
  edgeCount: number;
}

const STANDARDS: StandardType[] = ['PMBOK', 'PRINCE2', 'ISO_21502'];

export function GraphControls({
  similarityThreshold,
  onSimilarityThresholdChange,
  viewMode,
  onViewModeChange,
  standardFilters,
  onStandardFilterToggle,
  searchQuery,
  onSearchQueryChange,
  nodeCount,
  edgeCount,
}: GraphControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStandardDisplay = (std: StandardType) => {
    return std === 'ISO_21502' ? 'ISO 21502' : std;
  };

  return (
    <div className="relative">
      {/* Search bar with integrated controls button */}
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="text"
        placeholder="Search nodes..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="h-14 pl-12 pr-24 text-base rounded-xl border-muted-foreground/20 focus:border-primary"
      />
      
      {/* Right side buttons container */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-lg"
            onClick={() => onSearchQueryChange('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {/* Controls panel trigger */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg border border-muted-foreground/20 bg-background hover:bg-muted hover:border-primary/40"
              title="Graph Controls"
            >
              <Sliders className="h-4 w-4 text-primary" />
            </Button>
          </SheetTrigger>
        <SheetContent className="w-[340px] sm:w-[380px] flex flex-col p-0 bg-background/95 backdrop-blur-md border-border/50 !right-4 !top-4 !bottom-4 !h-auto rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sliders className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Graph Controls</h2>
                <p className="text-xs text-muted-foreground">
                  Customize visualization
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Similarity Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Similarity Threshold</Label>
                  <Badge variant="secondary" className="font-mono text-xs px-2">
                    {similarityThreshold.toFixed(2)}
                  </Badge>
                </div>
                <Slider
                  value={[similarityThreshold]}
                  onValueChange={([value]) => onSimilarityThresholdChange(value)}
                  min={0.5}
                  max={0.8}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Show connections with similarity above this threshold
                </p>
              </div>

              <Separator className="my-4" />

              {/* Standard Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Filter Standards</Label>
                <div className="space-y-2">
                  {STANDARDS.map((std) => {
                    const isActive = standardFilters.has(std);
                    const baseColor = std === 'PMBOK' ? '#3b82f6' : std === 'PRINCE2' ? '#a855f7' : '#14b8a6';
                    
                    return (
                      <button
                        key={std}
                        onClick={() => onStandardFilterToggle(std)}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium",
                          "border backdrop-blur-sm",
                          isActive
                            ? "shadow-md"
                            : "hover:shadow-sm opacity-60 hover:opacity-100"
                        )}
                        style={{
                          backgroundColor: isActive ? `${baseColor}15` : `${baseColor}08`,
                          borderColor: isActive ? `${baseColor}40` : `${baseColor}20`,
                          color: baseColor,
                        }}
                      >
                        {getStandardDisplay(std)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="my-4" />

              {/* View Mode */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">View Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={viewMode === 'clusters' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onViewModeChange('clusters')}
                    className="w-full"
                  >
                    Topics
                  </Button>
                  <Button
                    variant={viewMode === 'sections' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onViewModeChange('sections')}
                    className="w-full"
                  >
                    Sections
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {viewMode === 'clusters'
                    ? 'View by topic groups (34 clusters)'
                    : 'View all individual sections (359 nodes)'}
                </p>
              </div>

              <Separator className="my-4" />

              {/* Statistics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Statistics</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-muted-foreground">Total Nodes</span>
                    <span className="text-sm font-mono font-semibold">{nodeCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-muted-foreground">Total Edges</span>
                    <span className="text-sm font-mono font-semibold">{edgeCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-muted-foreground">Active Standards</span>
                    <span className="text-sm font-mono font-semibold">{standardFilters.size}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Reset Button */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border/30">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                onSimilarityThresholdChange(0.6);
                STANDARDS.forEach((std) => {
                  if (!standardFilters.has(std)) {
                    onStandardFilterToggle(std);
                  }
                });
                onSearchQueryChange('');
                onViewModeChange('clusters');
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}


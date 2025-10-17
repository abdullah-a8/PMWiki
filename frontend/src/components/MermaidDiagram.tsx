import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id = 'mermaid-diagram' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Initialize Mermaid with dark theme configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        // Dark theme colors - completely monochrome
        primaryColor: '#27272a',
        primaryTextColor: '#f4f4f5',
        primaryBorderColor: '#52525b',
        lineColor: '#71717a',
        secondaryColor: '#27272a',
        tertiaryColor: '#27272a',
        background: '#18181b',
        mainBkg: '#27272a',
        secondaryBkg: '#27272a',
        tertiaryBkg: '#27272a',
        textColor: '#f4f4f5',
        fontSize: '16px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        nodeBorder: '#52525b',
        clusterBkg: '#27272a',
        clusterBorder: '#52525b',
        edgeLabelBackground: '#27272a',
        // All special states same color
        activeTaskBkgColor: '#27272a',
        activeTaskBorderColor: '#52525b',
        doneTaskBkgColor: '#27272a',
        doneTaskBorderColor: '#52525b',
        critBkgColor: '#27272a',
        critBorderColor: '#52525b',
        defaultLinkColor: '#71717a',
        // Additional colors to override
        signalColor: '#52525b',
        signalTextColor: '#f4f4f5',
        labelTextColor: '#f4f4f5',
        errorBkgColor: '#27272a',
        errorTextColor: '#f4f4f5',
      },
      securityLevel: 'strict',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
        nodeSpacing: 50,
        rankSpacing: 50,
      },
      fontSize: 16,
    });

    // Render the diagram
    const renderDiagram = async () => {
      if (containerRef.current && chart) {
        try {
          // Clear previous content
          containerRef.current.innerHTML = '';

          // Strip all style directives to remove LLM-added colors
          const cleanedChart = chart.replace(/^\s*style\s+.+$/gm, '').trim();

          // Generate unique ID for this render
          const diagramId = `${id}-${Date.now()}`;

          // Render mermaid diagram with cleaned syntax
          const { svg } = await mermaid.render(diagramId, cleanedChart);

          // Insert SVG directly
          containerRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          containerRef.current.innerHTML =
            '<div class="flex items-center justify-center p-8 text-destructive text-sm">' +
            '<p>Failed to render diagram. The diagram syntax may be invalid.</p>' +
            '<pre class="mt-2 text-xs text-left overflow-auto max-w-full">' +
            (error instanceof Error ? error.message : 'Unknown error') +
            '</pre>' +
            '</div>';
        }
      }
    };

    renderDiagram();
  }, [chart, id]);

  const exportToPNG = async () => {
    if (!containerRef.current) return;

    setIsExporting(true);
    try {
      // Find SVG element
      const svgElement = containerRef.current.querySelector('svg');
      if (!svgElement) {
        console.error('No SVG element found in container');
        setIsExporting(false);
        return;
      }

      // Get SVG dimensions
      const bbox = svgElement.getBBox();
      const width = bbox.width || svgElement.width.baseVal.value;
      const height = bbox.height || svgElement.height.baseVal.value;

      // Scale factor for higher quality (3x resolution)
      const scale = 3;

      // Serialize SVG to string
      const svgData = new XMLSerializer().serializeToString(svgElement);

      // Encode SVG as data URL (avoids CORS issues)
      const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

      // Create high-resolution canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsExporting(false);
        return;
      }

      // Set canvas size with padding and scale
      const padding = 40 * scale;
      canvas.width = (width * scale) + padding;
      canvas.height = (height * scale) + padding;

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill with dark background
      ctx.fillStyle = '#18181b'; // zinc-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create and load image
      const img = new Image();

      img.onload = () => {
        try {
          // Draw SVG on canvas at higher resolution
          ctx.drawImage(img, padding / 2, padding / 2, width * scale, height * scale);

          // Convert to high-quality PNG (1.0 = maximum quality)
          const pngDataUrl = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = `process-flow-diagram-${Date.now()}.png`;
          link.href = pngDataUrl;
          link.click();

          setIsExporting(false);
        } catch (err) {
          console.error('Canvas export error:', err);
          setIsExporting(false);
        }
      };

      img.onerror = () => {
        console.error('Failed to load SVG image');
        setIsExporting(false);
      };

      // Set source as data URL
      img.src = svgDataUrl;
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
    }
  };

  return (
    <div className="relative w-full overflow-x-auto p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
      {/* Export Button */}
      <Button
        onClick={exportToPNG}
        disabled={isExporting}
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 z-10 h-8 px-3"
      >
        <Download className="h-4 w-4" />
      </Button>

      {/* Diagram Container */}
      <div ref={containerRef} className="mermaid-container flex justify-center" />
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, ArrowRight, Sparkles, Copy, Check, Grid3x3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_BASE_URL } from "@/lib/constants";
import type { SectionsByTopicResponse } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ComparisonSource {
  id: string;
  section_number: string;
  section_title: string;
  page_start: number;
  page_end?: number;
  citation: string;
  relevance_score: number;
  content_preview: string;
}

interface ComparisonSources {
  PMBOK: ComparisonSource[];
  PRINCE2: ComparisonSource[];
  ISO_21502: ComparisonSource[];
}

type ComparisonMode = "topic" | "section";

export function ComparePageStreaming() {
  const navigate = useNavigate();
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("topic");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [sources, setSources] = useState<ComparisonSources | null>(null);
  const [currentTopic, setCurrentTopic] = useState("");
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<SectionsByTopicResponse | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setStreamedContent("");
    setSources(null);
    setSectionData(null);
    setCurrentTopic(topic.trim());

    try {
      if (comparisonMode === "section") {
        // Section comparison mode - fetch top sections
        const response = await fetch(`${API_BASE_URL}/v1/sections-by-topic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: topic.trim(),
            top_k_per_standard: 1,
            score_threshold: 0.4
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: SectionsByTopicResponse = await response.json();
        setSectionData(data);
        setIsLoading(false);
        return;
      }

      // Topic comparison mode with streaming
      const response = await fetch(`${API_BASE_URL}/v1/compare/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          top_k_per_standard: 2,
          score_threshold: 0.4
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'metadata') {
                setSources(event.sources);
                setCurrentTopic(event.topic);
              } else if (event.type === 'chunk') {
                setStreamedContent(prev => prev + event.content);
              } else if (event.type === 'done') {
                setIsLoading(false);
              } else if (event.type === 'error') {
                setError(event.message);
                setIsLoading(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare standards');
      setIsLoading(false);
    }
  };

  const getStandardDisplayName = (std: string) => {
    return std === "ISO_21502" ? "ISO 21502" : std;
  };

  const getStandardBadgeColor = (standard: string) => {
    const colors: Record<string, string> = {
      PMBOK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PRINCE2: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ISO_21502: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return colors[standard] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(id);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  return (
    <div className={`mx-auto space-y-8 pb-12 ${!currentTopic ? 'max-w-3xl min-h-[calc(100vh-8rem)] flex flex-col justify-center' : 'max-w-6xl'}`}>
      {/* Header - Centered and Modern */}
      {!currentTopic && (
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Compare Standards</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose between AI-powered analysis or direct section comparison across PMBOK, PRINCE2, and ISO 21502
          </p>
        </div>
      )}

      {/* Compact header for results view */}
      {currentTopic && (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {comparisonMode === "topic" ? (
              <Sparkles className="h-5 w-5 text-primary" />
            ) : (
              <Grid3x3 className="h-5 w-5 text-primary" />
            )}
            Compare Standards
          </h1>
          <p className="text-sm text-muted-foreground">
            {comparisonMode === "topic"
              ? "AI-powered comparative analysis across all standards"
              : "Side-by-side section comparison across all standards"}
          </p>
        </div>
      )}

      {/* Comparison Input - Minimal Design */}
      <Card className="border-primary/20 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleCompare} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={comparisonMode === "topic"
                  ? "Enter a topic to compare (e.g., Risk Management, Stakeholder Engagement)"
                  : "Enter a topic to find relevant sections (e.g., Risk Management, Quality Assurance)"}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-14 pl-12 pr-16 text-base rounded-xl border-muted-foreground/20 focus:border-primary"
              />

              {/* Minimal Mode Selector */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 rounded-lg border border-muted-foreground/20 bg-background hover:bg-muted hover:border-primary/40"
                      type="button"
                      title={comparisonMode === "topic" ? "AI Topic Comparison" : "Section Comparison"}
                    >
                      {comparisonMode === "topic" ? (
                        <Sparkles className="h-4 w-4 text-primary" />
                      ) : (
                        <Grid3x3 className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={() => setComparisonMode("topic")}
                      className="cursor-pointer py-3"
                    >
                      <Sparkles className="mr-3 h-5 w-5 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">AI Topic Comparison</span>
                        <span className="text-xs text-muted-foreground">Deep analysis with insights</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setComparisonMode("section")}
                      className="cursor-pointer py-3"
                    >
                      <Grid3x3 className="mr-3 h-5 w-5 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">Section Comparison</span>
                        <span className="text-xs text-muted-foreground">View sections side-by-side</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <Button
              type="submit"
              disabled={!topic.trim() || isLoading}
              className="w-full h-12 text-base rounded-xl"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {comparisonMode === "topic" ? "Analyzing standards..." : "Finding sections..."}
                </>
              ) : (
                <>
                  {comparisonMode === "topic" ? <Sparkles className="mr-2 h-5 w-5" /> : <Grid3x3 className="mr-2 h-5 w-5" />}
                  {comparisonMode === "topic" ? "Compare Across All Standards" : "Find & Compare Sections"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State - Modern Skeleton */}
      {isLoading && !streamedContent && !sectionData && (
        <div className="space-y-6">
          {comparisonMode === "topic" && (
            <>
              {/* Analysis skeleton */}
              <Card className="border-primary/20 animate-pulse">
                <CardHeader>
                  <div className="h-7 w-56 bg-muted/50 rounded" />
                  <div className="h-4 w-72 bg-muted/30 rounded mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 w-full bg-muted/50 rounded" />
                  <div className="h-4 w-full bg-muted/50 rounded" />
                  <div className="h-4 w-5/6 bg-muted/50 rounded" />
                  <div className="h-4 w-full bg-muted/50 rounded" />
                  <div className="h-4 w-4/5 bg-muted/50 rounded" />
                </CardContent>
              </Card>
            </>
          )}

          {/* Sources/Sections skeleton */}
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-20 bg-muted/50 rounded-full" />
                  <div className="h-5 w-24 bg-muted/30 rounded mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted/50 rounded" />
                    <div className="h-3 w-20 bg-muted/30 rounded" />
                    <div className="h-3 w-full bg-muted/30 rounded" />
                    <div className="h-3 w-full bg-muted/30 rounded" />
                    {comparisonMode === "section" && (
                      <>
                        <div className="h-3 w-full bg-muted/30 rounded" />
                        <div className="h-3 w-full bg-muted/30 rounded" />
                        <div className="h-3 w-4/5 bg-muted/30 rounded" />
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {(streamedContent || sources) && (
        <>
          {/* Analysis Card with Streaming Markdown - Enhanced Design */}
          <Card className="border-primary/30 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-2xl">AI Comparative Analysis</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Analyzing: <span className="font-semibold text-foreground">{currentTopic}</span>
                  </CardDescription>
                </div>
                {isLoading && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Streaming...
                  </Badge>
                )}
              </div>
              <Separator />
            </CardHeader>
            <CardContent>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0 text-foreground">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mt-6 mb-3 first:mt-0 text-foreground border-b border-border pb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold mt-5 mb-2 first:mt-0 text-foreground">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h4>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-outside ml-6 space-y-2 mb-4 text-foreground/90">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-outside ml-6 space-y-2 mb-4 text-foreground/90">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-foreground/90 leading-relaxed">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-foreground/90">{children}</em>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-primary">
                          {children}
                        </code>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-foreground/80">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-4 py-2">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {streamedContent}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Sources by Standard - Enhanced Design */}
          {sources && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Source References</h2>
                <p className="text-sm text-muted-foreground">
                  Evidence from each standard used to generate this analysis
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* PMBOK Sources */}
                {sources.PMBOK.length > 0 && (
                  <Card className="hover:shadow-lg transition-shadow duration-300 border-blue-500/20 cursor-pointer">
                    <CardHeader className="space-y-3 pb-4">
                      <Badge
                        variant="outline"
                        className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("PMBOK")}`}
                      >
                        {getStandardDisplayName("PMBOK")}
                      </Badge>
                      <div>
                        <CardTitle className="text-base">
                          {sources.PMBOK.length} Reference{sources.PMBOK.length !== 1 ? 's' : ''}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Project Management Body of Knowledge
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4 space-y-4">
                      {sources.PMBOK.map((source, idx) => (
                        <div
                          key={idx}
                          className="space-y-2.5 hover:bg-muted/50 p-3 -mx-3 rounded-lg transition-colors cursor-pointer"
                          onClick={() => navigate(`/sections/${source.id}`)}
                        >
                          <div>
                            <p className="font-semibold text-sm leading-tight">{source.section_title}</p>
                            <p className="text-xs text-muted-foreground mt-1">§ {source.section_number}</p>
                          </div>
                          <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                            {source.content_preview}
                          </p>
                          <div className="flex items-start justify-between gap-2 pt-1">
                            <p className="text-xs text-muted-foreground italic flex-1">{source.citation}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(source.citation, `pmbok-${idx}`);
                              }}
                            >
                              {copiedCitation === `pmbok-${idx}` ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {idx < sources.PMBOK.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* PRINCE2 Sources */}
                {sources.PRINCE2.length > 0 && (
                  <Card className="hover:shadow-lg transition-shadow duration-300 border-purple-500/20 cursor-pointer">
                    <CardHeader className="space-y-3 pb-4">
                      <Badge
                        variant="outline"
                        className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("PRINCE2")}`}
                      >
                        {getStandardDisplayName("PRINCE2")}
                      </Badge>
                      <div>
                        <CardTitle className="text-base">
                          {sources.PRINCE2.length} Reference{sources.PRINCE2.length !== 1 ? 's' : ''}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Projects IN Controlled Environments
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4 space-y-4">
                      {sources.PRINCE2.map((source, idx) => (
                        <div
                          key={idx}
                          className="space-y-2.5 hover:bg-muted/50 p-3 -mx-3 rounded-lg transition-colors cursor-pointer"
                          onClick={() => navigate(`/sections/${source.id}`)}
                        >
                          <div>
                            <p className="font-semibold text-sm leading-tight">{source.section_title}</p>
                            <p className="text-xs text-muted-foreground mt-1">§ {source.section_number}</p>
                          </div>
                          <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                            {source.content_preview}
                          </p>
                          <div className="flex items-start justify-between gap-2 pt-1">
                            <p className="text-xs text-muted-foreground italic flex-1">{source.citation}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(source.citation, `prince2-${idx}`);
                              }}
                            >
                              {copiedCitation === `prince2-${idx}` ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {idx < sources.PRINCE2.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* ISO 21502 Sources */}
                {sources.ISO_21502.length > 0 && (
                  <Card className="hover:shadow-lg transition-shadow duration-300 border-teal-500/20 cursor-pointer">
                    <CardHeader className="space-y-3 pb-4">
                      <Badge
                        variant="outline"
                        className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("ISO_21502")}`}
                      >
                        {getStandardDisplayName("ISO_21502")}
                      </Badge>
                      <div>
                        <CardTitle className="text-base">
                          {sources.ISO_21502.length} Reference{sources.ISO_21502.length !== 1 ? 's' : ''}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          International Standard for PM
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4 space-y-4">
                      {sources.ISO_21502.map((source, idx) => (
                        <div
                          key={idx}
                          className="space-y-2.5 hover:bg-muted/50 p-3 -mx-3 rounded-lg transition-colors cursor-pointer"
                          onClick={() => navigate(`/sections/${source.id}`)}
                        >
                          <div>
                            <p className="font-semibold text-sm leading-tight">{source.section_title}</p>
                            <p className="text-xs text-muted-foreground mt-1">§ {source.section_number}</p>
                          </div>
                          <p className="text-xs text-muted-foreground/90 line-clamp-3 leading-relaxed">
                            {source.content_preview}
                          </p>
                          <div className="flex items-start justify-between gap-2 pt-1">
                            <p className="text-xs text-muted-foreground italic flex-1">{source.citation}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(source.citation, `iso-${idx}`);
                              }}
                            >
                              {copiedCitation === `iso-${idx}` ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {idx < sources.ISO_21502.length - 1 && <Separator className="mt-3" />}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Section Comparison Results */}
      {sectionData && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Section Comparison</h2>
            <p className="text-sm text-muted-foreground">
              Most relevant sections for: <span className="font-semibold text-foreground">{sectionData.topic}</span>
            </p>
          </div>

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

          <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-1">
            {/* PMBOK Section */}
            {sectionData.sections.PMBOK ? (
              <Card
                className="hover:shadow-lg transition-shadow duration-300 border-blue-500/20 flex flex-col cursor-pointer"
                onClick={() => navigate(`/sections/${sectionData.sections.PMBOK!.id}`)}
              >
                <CardHeader className="space-y-3 pb-4">
                  <Badge
                    variant="outline"
                    className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("PMBOK")}`}
                  >
                    {getStandardDisplayName("PMBOK")}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg leading-tight">{sectionData.sections.PMBOK.section_title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">§ {sectionData.sections.PMBOK.section_number}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Relevance: {(sectionData.sections.PMBOK.relevance_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 leading-relaxed text-sm text-foreground/90">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground/90 leading-relaxed text-sm">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                        }}
                      >
                        {sectionData.sections.PMBOK.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-4 mt-4 border-t">
                    <p className="text-xs text-muted-foreground italic flex-1">
                      {sectionData.sections.PMBOK.citation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(sectionData.sections.PMBOK!.citation, 'pmbok-section')}
                    >
                      {copiedCitation === 'pmbok-section' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-blue-500/20 opacity-50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">No PMBOK section found</p>
                </CardContent>
              </Card>
            )}

            {/* PRINCE2 Section */}
            {sectionData.sections.PRINCE2 ? (
              <Card
                className="hover:shadow-lg transition-shadow duration-300 border-purple-500/20 flex flex-col cursor-pointer"
                onClick={() => navigate(`/sections/${sectionData.sections.PRINCE2!.id}`)}
              >
                <CardHeader className="space-y-3 pb-4">
                  <Badge
                    variant="outline"
                    className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("PRINCE2")}`}
                  >
                    {getStandardDisplayName("PRINCE2")}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg leading-tight">{sectionData.sections.PRINCE2.section_title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">§ {sectionData.sections.PRINCE2.section_number}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Relevance: {(sectionData.sections.PRINCE2.relevance_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 leading-relaxed text-sm text-foreground/90">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground/90 leading-relaxed text-sm">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                        }}
                      >
                        {sectionData.sections.PRINCE2.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-4 mt-4 border-t">
                    <p className="text-xs text-muted-foreground italic flex-1">
                      {sectionData.sections.PRINCE2.citation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(sectionData.sections.PRINCE2!.citation, 'prince2-section')}
                    >
                      {copiedCitation === 'prince2-section' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-purple-500/20 opacity-50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">No PRINCE2 section found</p>
                </CardContent>
              </Card>
            )}

            {/* ISO 21502 Section */}
            {sectionData.sections.ISO_21502 ? (
              <Card
                className="hover:shadow-lg transition-shadow duration-300 border-teal-500/20 flex flex-col cursor-pointer"
                onClick={() => navigate(`/sections/${sectionData.sections.ISO_21502!.id}`)}
              >
                <CardHeader className="space-y-3 pb-4">
                  <Badge
                    variant="outline"
                    className={`w-fit text-base px-3 py-1 ${getStandardBadgeColor("ISO_21502")}`}
                  >
                    {getStandardDisplayName("ISO_21502")}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg leading-tight">{sectionData.sections.ISO_21502.section_title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">§ {sectionData.sections.ISO_21502.section_number}</p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Relevance: {(sectionData.sections.ISO_21502.relevance_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4 flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 leading-relaxed text-sm text-foreground/90">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-outside ml-4 space-y-1 mb-3 text-sm text-foreground/90">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground/90 leading-relaxed text-sm">{children}</li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                        }}
                      >
                        {sectionData.sections.ISO_21502.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-4 mt-4 border-t">
                    <p className="text-xs text-muted-foreground italic flex-1">
                      {sectionData.sections.ISO_21502.citation}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(sectionData.sections.ISO_21502!.citation, 'iso-section')}
                    >
                      {copiedCitation === 'iso-section' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-teal-500/20 opacity-50">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">No ISO 21502 section found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Search, Command as CommandIcon, Loader2, Copy, Check, ChevronDown, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useSearchHistoryActions } from "@/stores/useUserDataStore";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { API_BASE_URL } from "@/lib/constants";

interface SourceReference {
  id: string;
  standard: string;
  section_number: string;
  section_title: string;
  page_start: number;
  page_end?: number;
  content: string;
  citation: string;
  relevance_score: number;
}

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const previousQueryRef = useRef<string | null>(null);
  const { addSearch, getSearchByQuery } = useSearchHistoryActions();

  // Streaming state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedAnswer, setStreamedAnswer] = useState("");
  const [primarySources, setPrimarySources] = useState<SourceReference[]>([]);
  const [additionalContext, setAdditionalContext] = useState<SourceReference[]>([]);

  // Save to Zustand store when search completes successfully
  useEffect(() => {
    const query = searchParams.get("q");
    if (!isLoading && streamedAnswer && query && !isViewingHistory) {
      // Only save to history if this is NOT a history view
      const primarySourcesCount = primarySources?.length || 0;
      const standards = [...new Set(primarySources?.map(s => s.standard) || [])];

      addSearch({
        query,
        primarySourcesCount,
        standards,
        primarySources,
        additionalContext,
        answer: streamedAnswer,
      });
      previousQueryRef.current = query;
    }
  }, [isLoading, streamedAnswer, searchParams, isViewingHistory, primarySources, additionalContext, addSearch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);

      // Check if navigation came from history click
      const fromHistory = (location.state as { fromHistory?: boolean })?.fromHistory === true;

      if (fromHistory) {
        // User clicked from sidebar - this is viewing history
        setIsViewingHistory(true);
      } else {
        // This is a new search
        setIsViewingHistory(false);
        previousQueryRef.current = query;
      }
    } else {
      setSearchQuery("");
      setIsViewingHistory(false);
      previousQueryRef.current = null;
    }
  }, [searchParams, location.state]);

  // Streaming search function
  const performStreamingSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setStreamedAnswer("");
    setPrimarySources([]);
    setAdditionalContext([]);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/search/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          top_k_per_standard: 3,
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
                setPrimarySources(event.primary_sources || []);
                setAdditionalContext(event.additional_context || []);
                setIsLoading(false); // Stop loading once sources are received
              } else if (event.type === 'chunk') {
                setStreamedAnswer(prev => prev + event.content);
              } else if (event.type === 'done') {
                // Stream complete
              } else if (event.type === 'error') {
                setError(event.message);
                setIsLoading(false);
              }
            } catch {
              // Silent fail for parse errors
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // This is an active search submission - always set viewing history to false
      setIsViewingHistory(false);
      previousQueryRef.current = searchQuery.trim();
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const handleNewSearch = () => {
    setSearchParams({});
    setSearchQuery("");
    setIsViewingHistory(false);
    previousQueryRef.current = null;
    setStreamedAnswer("");
    setPrimarySources([]);
    setAdditionalContext([]);
  };

  // Trigger streaming search when search params change OR load from history
  useEffect(() => {
    const query = searchParams.get("q");
    if (!query) return;

    // Check if navigation came from history click
    const fromHistory = (location.state as { fromHistory?: boolean })?.fromHistory === true;

    if (fromHistory) {
      // ONLY load from cached history - NEVER trigger a backend request for history items
      const cachedSearch = getSearchByQuery(query);

      if (cachedSearch && cachedSearch.answer && cachedSearch.primarySources) {
        // We have cached results - use them
        setStreamedAnswer(cachedSearch.answer);
        setPrimarySources(cachedSearch.primarySources);
        setAdditionalContext(cachedSearch.additionalContext || []);
        setIsLoading(false);
        setError(null);
      } else {
        // No cached results - this should never happen because validSearchHistory() filters them out
        // But if it does, show an error instead of making a backend request
        setError("This search is no longer available in history. Please search again.");
        setIsLoading(false);
        setStreamedAnswer("");
        setPrimarySources([]);
        setAdditionalContext([]);
      }
    } else {
      // This is a new search - always fetch from backend
      performStreamingSearch(query);
      previousQueryRef.current = query;
    }
  }, [searchParams, location.state, getSearchByQuery]);

  const getStandardDisplayName = (std: string) => {
    return std === "ISO_21502" ? "ISO 21502" : std;
  };

  const getStandardBadgeColor = (standard: string) => {
    const normalizedStandard = standard.replace(" ", "_");
    const colors: Record<string, string> = {
      PMBOK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PRINCE2: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ISO_21502: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return colors[normalizedStandard] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(id);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  const hasSearched = searchParams.get("q") !== null;

  return (
    <div className="w-full relative">
      {/* Initial centered search view */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img 
                src="/documents.svg" 
                alt="PMWiki Logo" 
                className="w-12 h-12 text-primary"
              />
              <h1 className="text-6xl font-bold tracking-tight">PMWiki</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Citation-focused search for PM standards
            </p>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Ask a question... (e.g., 'How does PMBOK handle risk management?')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-4 text-base shadow-sm rounded-full"
              />
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
              <span>Press</span>
              <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
                <CommandIcon className="h-3 w-3" />K
              </kbd>
              <span>to focus</span>
            </div>
          </form>
        </div>
      )}

      {/* Search results view */}
      {hasSearched && (
        <div className="max-w-6xl mx-auto space-y-6 pb-32">
          {/* Loading State - Modern AI Style */}
          {isLoading && (
            <div className="space-y-6">
              {/* Skeleton for Primary Sources */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-8 w-64 bg-muted/50 rounded-lg animate-pulse" />
                  <div className="h-4 w-48 bg-muted/30 rounded animate-pulse" />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="flex flex-col animate-pulse">
                      <CardHeader className="space-y-3">
                        <div className="h-6 w-20 bg-muted/50 rounded-full" />
                        <div className="h-6 w-full bg-muted/50 rounded" />
                        <div className="h-4 w-24 bg-muted/30 rounded" />
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <div className="h-4 w-full bg-muted/50 rounded" />
                          <div className="h-4 w-full bg-muted/50 rounded" />
                          <div className="h-4 w-3/4 bg-muted/50 rounded" />
                        </div>
                        <div className="h-px w-full bg-muted/30" />
                        <div className="space-y-2">
                          <div className="h-3 w-full bg-muted/30 rounded" />
                          <div className="h-9 w-full bg-muted/50 rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Skeleton for LLM Answer */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-8 w-56 bg-muted/50 rounded-lg animate-pulse" />
                  <div className="h-4 w-64 bg-muted/30 rounded animate-pulse" />
                </div>

                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-40 bg-muted/50 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-muted/30 rounded-full animate-pulse" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 w-4/5 bg-muted/50 rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to search. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {(primarySources.length > 0 || streamedAnswer) && (
            <>
              {/* Primary Sources - One per Standard (Side by Side) */}
              {primarySources && primarySources.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Most Relevant Results</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top result from each standard
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {primarySources.map((section, index) => (
                      <Card key={`${section.standard}-${section.section_number}-${index}`} className="flex flex-col">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`w-fit ${getStandardBadgeColor(section.standard)}`}
                            >
                              {getStandardDisplayName(section.standard)}
                            </Badge>
                            <BookmarkButton
                              section={section}
                              from="search"
                              size="sm"
                            />
                          </div>
                          <CardTitle className="text-lg mt-2">{section.section_title}</CardTitle>
                          <CardDescription>Section {section.section_number}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                          <div className="text-sm line-clamp-4 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                            <Markdown remarkPlugins={[remarkGfm]}>{section.content}</Markdown>
                          </div>

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs text-muted-foreground flex-1">
                                {section.citation}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => copyToClipboard(section.citation, section.standard + section.section_number)}
                              >
                                {copiedCitation === section.standard + section.section_number ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => navigate(`/sections/${section.id}`)}
                            >
                              View in Library
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* LLM Answer Card */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold">Analysis & Comparison</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Synthesized answer comparing all standards
                  </p>
                </div>

                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Generated Answer</CardTitle>
                      {isLoading && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Streaming...
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                      <Markdown
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
                        {streamedAnswer}
                      </Markdown>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Context Section */}
              {additionalContext && additionalContext.length > 0 && (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAdditional(!showAdditional)}
                  >
                    <span className="flex-1 text-left">
                      Additional Reading ({additionalContext.length} sections)
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdditional ? 'rotate-180' : ''}`} />
                  </Button>

                  {showAdditional && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {additionalContext.map((section, index) => (
                        <Card key={`${section.standard}-${section.section_number}-additional-${index}`}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={`w-fit ${getStandardBadgeColor(section.standard)}`}
                              >
                                {getStandardDisplayName(section.standard)}
                              </Badge>
                              <BookmarkButton
                                section={section}
                                from="search"
                                size="sm"
                              />
                            </div>
                            <CardTitle className="text-base mt-2">{section.section_title}</CardTitle>
                            <CardDescription>Section {section.section_number}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm line-clamp-3 prose prose-sm prose-zinc dark:prose-invert max-w-none">
                              <Markdown remarkPlugins={[remarkGfm]}>{section.content}</Markdown>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => navigate(`/sections/${section.id}`)}
                            >
                              View in Library
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Fixed Search Bar at Bottom - Only show when NOT viewing history and NOT loading */}
      {hasSearched && !isViewingHistory && !isLoading && (
        <div className="sticky bottom-[-16px] left-0 right-0 z-50 flex justify-center mt-6 pointer-events-none">
          <div className="pointer-events-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border shadow-lg rounded-2xl p-3">
            <form onSubmit={handleSearch} className="flex gap-2 items-center">
              <div className="relative w-[500px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Ask another question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10 pr-10 rounded-full"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button type="submit" className="rounded-full px-6 shrink-0">
                Search
              </Button>
              <Button type="button" variant="outline" className="rounded-full px-6 shrink-0" onClick={handleNewSearch}>
                New
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

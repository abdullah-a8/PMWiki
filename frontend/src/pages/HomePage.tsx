import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Search, Command as CommandIcon, Loader2, Copy, Check, ChevronDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { searchHistoryStorage } from "@/lib/searchHistory";
import type { SearchResult } from "@/types";

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

  const { data, isLoading, error, refetch } = useQuery<SearchResult>({
    queryKey: ["search", searchParams.get("q")],
    queryFn: async () => {
      const query = searchParams.get("q");
      if (!query) throw new Error("No query provided");
      const response = await api.post("/v1/search", { query });
      return response.data;
    },
    enabled: !!searchParams.get("q"),
  });

  // Save to localStorage when search completes successfully
  useEffect(() => {
    const currentQuery = searchParams.get("q");
    if (data && currentQuery && !isViewingHistory) {
      // Only save to history if this is NOT a history view
      const primarySourcesCount = data.primary_sources?.length || 0;
      const standards = [...new Set(data.primary_sources?.map(s => s.standard) || [])];

      searchHistoryStorage.addSearch(currentQuery, primarySourcesCount, standards, true);
      window.dispatchEvent(new Event('searchHistoryUpdated'));
      previousQueryRef.current = currentQuery;
    }
  }, [data, searchParams, isViewingHistory]);

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
      const fromHistory = (location.state as any)?.fromHistory === true;

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // This is an active search submission - always set viewing history to false
      setIsViewingHistory(false);
      previousQueryRef.current = searchQuery.trim();
      setSearchParams({ q: searchQuery.trim() });
      // No need to call refetch() - the query will auto-run when searchParams changes
    }
  };

  const handleNewSearch = () => {
    setSearchParams({});
    setSearchQuery("");
    setIsViewingHistory(false);
    previousQueryRef.current = null;
  };

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
    <div className="w-full">
      {/* Initial centered search view */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-4 tracking-tight">PMWiki</h1>
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
          {data && !isLoading && (
            <>
              {/* Primary Sources - One per Standard (Side by Side) */}
              {data.primary_sources && data.primary_sources.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Most Relevant Results</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Top result from each standard
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {data.primary_sources.map((section, index) => (
                      <Card key={`${section.standard}-${section.section_number}-${index}`} className="flex flex-col">
                        <CardHeader>
                          <Badge
                            variant="outline"
                            className={`w-fit ${getStandardBadgeColor(section.standard)}`}
                          >
                            {getStandardDisplayName(section.standard)}
                          </Badge>
                          <CardTitle className="text-lg mt-2">{section.section_title}</CardTitle>
                          <CardDescription>Section {section.section_number}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                          <p className="text-sm line-clamp-4">{section.content}</p>

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
                              onClick={() => navigate(`/library/${section.standard}`)}
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
                      {data.usage_stats && (
                        <Badge variant="secondary" className="text-xs">
                          {data.usage_stats.tokens.total_tokens} tokens
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base leading-relaxed whitespace-pre-line">
                      {data.answer}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Context Section */}
              {data.additional_context && data.additional_context.length > 0 && (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAdditional(!showAdditional)}
                  >
                    <span className="flex-1 text-left">
                      Additional Reading ({data.additional_context.length} sections)
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdditional ? 'rotate-180' : ''}`} />
                  </Button>

                  {showAdditional && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.additional_context.map((section, index) => (
                        <Card key={`${section.standard}-${section.section_number}-additional-${index}`}>
                          <CardHeader>
                            <Badge
                              variant="outline"
                              className={`w-fit ${getStandardBadgeColor(section.standard)}`}
                            >
                              {getStandardDisplayName(section.standard)}
                            </Badge>
                            <CardTitle className="text-base mt-2">{section.section_title}</CardTitle>
                            <CardDescription>Section {section.section_number}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm line-clamp-3">{section.content}</p>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => navigate(`/library/${section.standard}`)}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
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
              <Button type="submit" className="rounded-full px-6">
                Search
              </Button>
              <Button type="button" variant="outline" className="rounded-full px-6" onClick={handleNewSearch}>
                New
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

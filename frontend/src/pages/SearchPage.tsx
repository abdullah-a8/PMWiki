import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2, Copy, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { SearchResult, SourceReference } from "@/types";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<SearchResult>({
    queryKey: ["search", searchQuery],
    queryFn: async () => {
      const response = await api.post("/v1/search", { query: searchQuery });
      return response.data;
    },
    enabled: !!searchQuery,
  });

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
      refetch();
    }
  };

  const getStandardDisplayName = (std: string) => {
    return std === "ISO_21502" ? "ISO 21502" : std;
  };

  const getStandardBadgeColor = (standard: string) => {
    // Normalize to underscore format for lookup
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

  // Backend already provides formatted citations, so we can use them directly
  const getCitation = (source: SourceReference) => {
    return source.citation;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search Input Section */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Search Standards</h1>
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ask a question... (e.g., 'How does PMBOK handle risk management?')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-11 pr-4"
            />
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Searching standards...</span>
          </CardContent>
        </Card>
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
          {/* LLM Answer Card */}
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

          {/* Primary Sources Section */}
          {data.primary_sources && data.primary_sources.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">Sources for this answer</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Primary references from PM standards
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
                          disabled
                          title="Section detail integration coming soon"
                        >
                          View Full Section
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Additional Context Section */}
          {data.additional_context && data.additional_context.length > 0 && (
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="additional">
                  <AccordionTrigger className="text-xl font-semibold">
                    Additional Reading ({data.additional_context.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 md:grid-cols-2 pt-4">
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
                              disabled
                              title="Section detail integration coming soon"
                            >
                              View Section
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!searchQuery && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start your search</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Enter a natural language question to search across PMBOK, PRINCE2, and ISO 21502 standards.
            </p>
            <div className="space-y-2 text-left">
              <p className="text-sm font-medium">Try these example queries:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "How does PMBOK handle risk management?"</li>
                <li>• "What are the key principles of PRINCE2?"</li>
                <li>• "Stakeholder engagement best practices"</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

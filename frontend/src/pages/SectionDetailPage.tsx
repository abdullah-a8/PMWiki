import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { Section, StandardInfo } from "@/types";

export function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);

  const { data: section, isLoading, error } = useQuery<Section>({
    queryKey: ["section", id],
    queryFn: async () => {
      const response = await api.get(`/v1/sections/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch all sections from the same standard for navigation
  const { data: standardSections } = useQuery<StandardInfo>({
    queryKey: ["standard-sections", section?.standard],
    queryFn: async () => {
      const response = await api.get(`/v1/standards/${section?.standard}/sections`);
      return response.data;
    },
    enabled: !!section?.standard,
  });

  // Find current section index and get prev/next
  const currentIndex = standardSections?.sections.findIndex((s) => s.id === id) ?? -1;
  const previousSection = currentIndex > 0 ? standardSections?.sections[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 && currentIndex < (standardSections?.sections.length ?? 0) - 1
    ? standardSections?.sections[currentIndex + 1]
    : null;

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

  const copyToClipboard = (text: string, citationType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(citationType);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load section details. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Section Header */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Badge
              variant="outline"
              className={`w-fit ${getStandardBadgeColor(section.standard)}`}
            >
              {getStandardDisplayName(section.standard)}
            </Badge>
            {section.page_start && (
              <Badge variant="secondary" className="text-xs">
                Page {section.page_start}
              </Badge>
            )}
          </div>

          <div>
            <CardTitle className="text-3xl">{section.section_title}</CardTitle>
            <p className="text-muted-foreground mt-2">Section {section.section_number}</p>
          </div>

        </CardHeader>

        {/* Section Content */}
        <CardContent className="space-y-4">
          <div className="prose prose-zinc dark:prose-invert max-w-none">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style headings
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                  h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-3 mb-2" {...props} />,

                  // Style paragraphs
                  p: ({ node, ...props }) => <p className="text-base leading-relaxed mb-4" {...props} />,

                  // Style lists
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-base leading-relaxed ml-4" {...props} />,

                  // Style emphasis
                  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                  em: ({ node, ...props }) => <em className="italic" {...props} />,

                  // Style code blocks
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-muted p-3 rounded text-sm font-mono overflow-x-auto" {...props}>
                        {children}
                      </code>
                    );
                  },

                  // Style blockquotes
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic my-4" {...props} />
                  ),

                  // Style horizontal rules
                  hr: ({ node, ...props }) => <hr className="my-6 border-border" {...props} />,
                }}
              >
                {section.content}
              </Markdown>
            </div>

          <Separator />

          {/* Citation Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Citations</h3>

            {/* APA Citation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">APA</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(section.citation_apa, "apa")}
                >
                  {copiedCitation === "apa" ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm bg-muted p-2 rounded">{section.citation_apa}</p>
            </div>

            {/* IEEE Citation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">IEEE</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(section.citation_ieee, "ieee")}
                >
                  {copiedCitation === "ieee" ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm bg-muted p-2 rounded">{section.citation_ieee}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => previousSection && navigate(`/section/${previousSection.id}`)}
          disabled={!previousSection}
          className="flex-1 justify-start"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-xs text-muted-foreground">Previous</span>
            {previousSection && (
              <span className="text-sm truncate w-full">
                {previousSection.section_number}: {previousSection.section_title}
              </span>
            )}
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => nextSection && navigate(`/section/${nextSection.id}`)}
          disabled={!nextSection}
          className="flex-1 justify-end"
        >
          <div className="flex flex-col items-end overflow-hidden">
            <span className="text-xs text-muted-foreground">Next</span>
            {nextSection && (
              <span className="text-sm truncate w-full">
                {nextSection.section_number}: {nextSection.section_title}
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

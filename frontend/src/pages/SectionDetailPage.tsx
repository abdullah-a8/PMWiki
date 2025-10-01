import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { Section } from "@/types";

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

  const getStandardBadgeColor = (standard: string) => {
    const colors: Record<string, string> = {
      PMBOK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PRINCE2: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "ISO 21502": "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return colors[standard] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const copyToClipboard = (text: string, citationType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(citationType);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  const generateAPACitation = (section: Section) => {
    const year = new Date().getFullYear();
    return `${section.standard}. (${year}). ${section.title}. Section ${section.section_id}.`;
  };

  const generateIEEECitation = (section: Section) => {
    const year = new Date().getFullYear();
    return `${section.standard}, "${section.title}," Section ${section.section_id}, ${year}.`;
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
              {section.standard}
            </Badge>
            {section.token_count && (
              <Badge variant="secondary" className="text-xs">
                {section.token_count} tokens
              </Badge>
            )}
          </div>

          <div>
            <CardTitle className="text-3xl">{section.title}</CardTitle>
            <p className="text-muted-foreground mt-2">Section {section.section_id}</p>
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
                  onClick={() => copyToClipboard(generateAPACitation(section), "apa")}
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
              <p className="text-sm bg-muted p-2 rounded">{generateAPACitation(section)}</p>
            </div>

            {/* IEEE Citation */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">IEEE</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => copyToClipboard(generateIEEECitation(section), "ieee")}
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
              <p className="text-sm bg-muted p-2 rounded">{generateIEEECitation(section)}</p>
            </div>
          </div>
        </CardHeader>

        {/* Section Content */}
        <CardContent className="space-y-4">
          <Separator />
          <div>
            <h3 className="font-semibold mb-4">Content</h3>
            <p className="text-base leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Related Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(`/standards/${section.standard}`)}
          >
            View all sections from {section.standard}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate(`/search?q=${encodeURIComponent(section.title)}`)}
          >
            Search for similar content
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

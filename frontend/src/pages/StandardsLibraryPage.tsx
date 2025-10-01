import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Search, BookOpen } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { StandardInfo, SectionListItem } from "@/types";

export function StandardsLibraryPage() {
  const { standard } = useParams<{ standard: string }>();
  const navigate = useNavigate();
  const [searchFilter, setSearchFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const sectionsPerPage = 25;

  const { data: standardInfo, isLoading, error } = useQuery<StandardInfo>({
    queryKey: ["standard", standard],
    queryFn: async () => {
      const response = await api.get(`/v1/standards/${standard}/sections`);
      return response.data;
    },
    enabled: !!standard,
  });

  const getStandardBadgeColor = (std: string) => {
    const colors: Record<string, string> = {
      PMBOK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PRINCE2: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ISO_21502: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return colors[std] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const filteredSections = standardInfo?.sections.filter(
    (section) =>
      section.section_title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      section.section_number.toLowerCase().includes(searchFilter.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredSections.length / sectionsPerPage);
  const paginatedSections = filteredSections.slice(
    (currentPage - 1) * sectionsPerPage,
    currentPage * sectionsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !standardInfo) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load standard information. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/library")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Library
      </Button>

      {/* Standard Overview Card */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              className={`text-lg px-4 py-1 ${getStandardBadgeColor(standardInfo.standard)}`}
            >
              {standardInfo.standard}
            </Badge>
            <Badge variant="secondary">
              {standardInfo.total_sections} sections
            </Badge>
          </div>

          <div>
            <CardTitle className="text-2xl">{standardInfo.standard} Standard</CardTitle>
            <CardDescription className="mt-2 text-base">
              {standardInfo.description || "Project Management Standard"}
            </CardDescription>
          </div>

          <Separator />

          {/* Search within standard */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sections..."
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => navigate(`/search?q=${encodeURIComponent(standardInfo.standard)}`)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search in {standardInfo.standard}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Table of Contents
          </CardTitle>
          <CardDescription>
            {filteredSections.length === standardInfo.sections.length
              ? `Showing all ${standardInfo.sections.length} sections`
              : `Showing ${filteredSections.length} of ${standardInfo.sections.length} sections`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paginatedSections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sections found matching "{searchFilter}"
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {paginatedSections.map((section) => {
                  // Calculate indentation based on hierarchy level
                  const indentLevel = Math.max(0, section.level - 1);
                  const indentPx = indentLevel * 24; // 24px per level

                  return (
                    <Button
                      key={section.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-3 hover:bg-secondary/80"
                      onClick={() => navigate(`/sections/${section.id}`)}
                      style={{ paddingLeft: `${12 + indentPx}px` }}
                    >
                      <div className="flex items-start gap-3 text-left w-full">
                        <span className="font-mono text-xs text-muted-foreground shrink-0 mt-0.5 min-w-[60px]">
                          {section.section_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className={`${section.level === 1 ? 'font-semibold text-base' : 'font-medium'}`}>
                            {section.section_title}
                          </div>
                          {section.page_start && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Page {section.page_start}
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

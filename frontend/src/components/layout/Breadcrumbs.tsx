import React from "react";
import { useLocation, Link, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const location = useLocation();
  const params = useParams();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Fetch section data if we're on a section detail page
  const { data: section } = useQuery({
    queryKey: ["section", params.id],
    queryFn: async () => {
      const response = await api.get(`/v1/sections/${params.id}`);
      return response.data;
    },
    enabled: pathSegments[0] === "sections" && !!params.id,
  });

  // Don't show breadcrumbs on home page
  if (pathSegments.length === 0) {
    return null;
  }

  const formatSegment = (segment: string) => {
    // Capitalize first letter and replace hyphens with spaces
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStandardDisplayName = (std: string) => {
    return std === "ISO_21502" ? "ISO 21502" : std;
  };

  // Special handling for section detail pages
  if (pathSegments[0] === "sections" && section) {
    return (
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1">
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/library">Library</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/library/${section.standard}`}>
                {getStandardDisplayName(section.standard)}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          <BreadcrumbSeparator>
            <ChevronRight className="h-4 w-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>Section {section.section_number}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Default breadcrumb rendering for other pages
  const getSegmentPath = (index: number) => {
    return "/" + pathSegments.slice(0, index + 1).join("/");
  };

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const path = getSegmentPath(index);

          return (
            <React.Fragment key={path}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{formatSegment(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{formatSegment(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

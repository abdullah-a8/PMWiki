import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HealthCheckResponse } from "@/types";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { data: health, isLoading } = useQuery<HealthCheckResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get("/v1/health");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 bg-background">
      {/* Sidebar toggle button */}
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="-ml-1"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      )}

      {/* Logo/Branding */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">PMWiki</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* API Status Indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`h-2 w-2 rounded-full ${
            isLoading
              ? "bg-yellow-500 animate-pulse"
              : health?.status === "healthy"
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />
        <span className="hidden sm:inline text-muted-foreground">
          {isLoading ? "Connecting" : health?.status === "healthy" ? "Connected" : "Offline"}
        </span>
      </div>
    </header>
  );
}

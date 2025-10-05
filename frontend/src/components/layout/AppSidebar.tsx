import { Search, GitCompare, FileText, Library, Clock, X, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { searchHistoryStorage, type SearchHistoryItem } from "@/lib/searchHistory";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HealthCheckResponse } from "@/types";

const menuItems = [
  {
    title: "Search",
    url: "/",
    icon: Search,
  },
  {
    title: "Compare Standards",
    url: "/compare",
    icon: GitCompare,
  },
  {
    title: "Generate Process",
    url: "/generate",
    icon: FileText,
  },
  {
    title: "Browse Library",
    url: "/library",
    icon: Library,
  },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  const { data: health, isLoading } = useQuery<HealthCheckResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get("/v1/health");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  // Load search history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      const history = searchHistoryStorage.getHistory();
      setSearchHistory(history);
    };

    loadHistory();

    // Listen for storage changes (from other tabs or updates)
    const handleStorageChange = () => {
      loadHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('searchHistoryUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('searchHistoryUpdated', handleStorageChange);
    };
  }, []);

  const handleHistoryClick = (query: string) => {
    navigate(`/?q=${encodeURIComponent(query)}`, { state: { fromHistory: true } });
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    searchHistoryStorage.removeSearch(id);
    setSearchHistory(searchHistoryStorage.getHistory());
    window.dispatchEvent(new Event('searchHistoryUpdated'));
  };

  const handleClearHistory = () => {
    searchHistoryStorage.clearHistory();
    setSearchHistory([]);
    window.dispatchEvent(new Event('searchHistoryUpdated'));
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header with Logo and Toggle */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="-ml-1"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        {!isCollapsed && (
          <span className="text-lg font-semibold">PMWiki</span>
        )}
      </div>

      {/* Main Navigation */}
      <div className="p-4">
        <nav className="space-y-1">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.url;
              const linkContent = (
                <Link
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center rounded-lg py-2 text-sm transition-all duration-300",
                    isCollapsed ? "justify-center px-2" : "gap-3 px-4",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-300 whitespace-nowrap",
                      isCollapsed
                        ? "opacity-0 w-0 overflow-hidden"
                        : "opacity-100 w-auto"
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </TooltipProvider>
        </nav>
      </div>

      {/* Recent Searches Section */}
      {!isCollapsed && searchHistory.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col border-t mt-4">
          <div className="p-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Recent Searches</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleClearHistory}
            >
              Clear
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {searchHistory.map((item) => {
                const currentQuery = new URLSearchParams(location.search).get("q");
                const isActive = currentQuery?.toLowerCase() === item.query.toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative rounded-lg transition-colors cursor-pointer",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-secondary/50"
                    )}
                    onClick={() => handleHistoryClick(item.query)}
                  >
                    <div className="p-2 pr-8">
                      <p className="text-sm line-clamp-2 text-foreground">
                        {item.query}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {item.primarySourcesCount} results
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleRemoveHistory(e, item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed state - just show icon */}
      {isCollapsed && searchHistory.length > 0 && (
        <div className="border-t mt-4 p-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Recent Searches ({searchHistory.length})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Backend Connection Status */}
      <div className="mt-auto border-t p-4">
        <TooltipProvider delayDuration={0}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isLoading
                        ? "bg-yellow-500 animate-pulse"
                        : health?.status === "healthy"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isLoading ? "Connecting" : health?.status === "healthy" ? "Connected" : "Offline"}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
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
              <span className="text-muted-foreground">
                {isLoading ? "Connecting" : health?.status === "healthy" ? "Connected" : "Offline"}
              </span>
            </div>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

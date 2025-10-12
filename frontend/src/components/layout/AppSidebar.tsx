import { Search, GitCompare, FileText, Library, Clock, X, Menu, Network, Bookmark, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSearchHistory, useSearchHistoryActions, useBookmarkCount, useBookmarkActions, useBookmarksByStandard } from "@/stores/useUserDataStore";
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
    title: "Topic Network",
    url: "/graph",
    icon: Network,
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
  const searchHistory = useSearchHistory();
  const { removeSearch, clearSearchHistory } = useSearchHistoryActions();

  // Bookmarks state
  const bookmarkCount = useBookmarkCount();
  const pmbokBookmarks = useBookmarksByStandard('PMBOK');
  const prince2Bookmarks = useBookmarksByStandard('PRINCE2');
  const isoBookmarks = useBookmarksByStandard('ISO_21502');
  const { clearBookmarks } = useBookmarkActions();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    PMBOK: false,
    PRINCE2: false,
    ISO_21502: false,
  });

  const [isBookmarksSectionCollapsed, setIsBookmarksSectionCollapsed] = useState(false);
  const [showClearBookmarksDialog, setShowClearBookmarksDialog] = useState(false);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);

  const toggleGroup = (standard: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [standard]: !prev[standard],
    }));
  };

  const { data: health, isLoading } = useQuery<HealthCheckResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get("/v1/health");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
  });

  const handleHistoryClick = (query: string) => {
    navigate(`/?q=${encodeURIComponent(query)}`, { state: { fromHistory: true } });
  };

  const handleRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSearch(id);
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
    <div className="flex h-full flex-col bg-transparent">
      {/* Header with Logo and Toggle */}
      <div className={cn(
        "flex h-16 shrink-0 items-center px-4 mb-1",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && (
          <span className="text-lg font-semibold">PMWiki</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="shrink-0 h-9 w-9"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="px-3">
        <nav className="space-y-1">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.url;
              const linkContent = (
                <Link
                  key={item.title}
                  to={item.url}
                  className={cn(
                    "flex items-center rounded-lg py-2.5 text-sm transition-all duration-300",
                    isCollapsed ? "justify-center px-0 w-10 mx-auto" : "gap-3 px-3",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate">
                      {item.title}
                    </span>
                  )}
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

      {/* Bookmarks Section */}
      {!isCollapsed && bookmarkCount > 0 && (
        <div className="overflow-hidden flex flex-col mt-4 shrink-0" style={{ maxHeight: isBookmarksSectionCollapsed ? 'auto' : '40vh' }}>
          <div className="px-4 pb-2 flex items-center justify-between shrink-0">
            <button
              onClick={() => setIsBookmarksSectionCollapsed(!isBookmarksSectionCollapsed)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isBookmarksSectionCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <Bookmark className="h-4 w-4" />
              <span>Bookmarks</span>
              <Badge variant="secondary" className="text-xs">
                {bookmarkCount}
              </Badge>
            </button>
            {!isBookmarksSectionCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowClearBookmarksDialog(true)}
              >
                Clear
              </Button>
            )}
          </div>

          {!isBookmarksSectionCollapsed && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 min-h-0">
            <div className="space-y-1">
              {/* PMBOK Group */}
              {pmbokBookmarks.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-8 px-2"
                    onClick={() => toggleGroup('PMBOK')}
                  >
                    <div className="flex items-center gap-2">
                      {collapsedGroups.PMBOK ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs"
                      >
                        PMBOK
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {pmbokBookmarks.length}
                    </span>
                  </Button>

                  {!collapsedGroups.PMBOK && (
                    <div className="ml-4 mt-1 space-y-1">
                      {pmbokBookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="group relative rounded-lg transition-colors cursor-pointer hover:bg-secondary/50 min-w-0"
                          onClick={() => navigate(`/sections/${bookmark.id}`)}
                        >
                          <div className="p-2 min-w-0">
                            <p className="text-sm line-clamp-2 text-foreground break-words">
                              {bookmark.section_title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                § {bookmark.section_number}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PRINCE2 Group */}
              {prince2Bookmarks.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-8 px-2"
                    onClick={() => toggleGroup('PRINCE2')}
                  >
                    <div className="flex items-center gap-2">
                      {collapsedGroups.PRINCE2 ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs"
                      >
                        PRINCE2
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {prince2Bookmarks.length}
                    </span>
                  </Button>

                  {!collapsedGroups.PRINCE2 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {prince2Bookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="group relative rounded-lg transition-colors cursor-pointer hover:bg-secondary/50 min-w-0"
                          onClick={() => navigate(`/sections/${bookmark.id}`)}
                        >
                          <div className="p-2 min-w-0">
                            <p className="text-sm line-clamp-2 text-foreground break-words">
                              {bookmark.section_title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                § {bookmark.section_number}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ISO 21502 Group */}
              {isoBookmarks.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-8 px-2"
                    onClick={() => toggleGroup('ISO_21502')}
                  >
                    <div className="flex items-center gap-2">
                      {collapsedGroups.ISO_21502 ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <Badge
                        variant="outline"
                        className="bg-teal-500/10 text-teal-500 border-teal-500/20 text-xs"
                      >
                        ISO 21502
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isoBookmarks.length}
                    </span>
                  </Button>

                  {!collapsedGroups.ISO_21502 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {isoBookmarks.map((bookmark) => (
                        <div
                          key={bookmark.id}
                          className="group relative rounded-lg transition-colors cursor-pointer hover:bg-secondary/50 min-w-0"
                          onClick={() => navigate(`/sections/${bookmark.id}`)}
                        >
                          <div className="p-2 min-w-0">
                            <p className="text-sm line-clamp-2 text-foreground break-words">
                              {bookmark.section_title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                § {bookmark.section_number}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {/* Collapsed state - show bookmark icon */}
      {isCollapsed && bookmarkCount > 0 && (
        <div className="mt-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center text-muted-foreground">
                  <Bookmark className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Bookmarks ({bookmarkCount})</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Recent Searches Section */}
      {!isCollapsed && searchHistory.length > 0 && (
        <div className={cn(
          "flex-1 overflow-hidden flex flex-col min-h-0",
          bookmarkCount > 0 ? (isBookmarksSectionCollapsed ? "mt-2" : "mt-2") : "mt-4"
        )}>
          <div className="px-4 pb-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Recent Searches</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowClearHistoryDialog(true)}
            >
              Clear
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 min-h-0">
            <div className="space-y-1">
              {searchHistory.map((item) => {
                const currentQuery = new URLSearchParams(location.search).get("q");
                const isActive = currentQuery?.toLowerCase() === item.query.toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative rounded-lg transition-colors cursor-pointer min-w-0",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "hover:bg-secondary/50"
                    )}
                    onClick={() => handleHistoryClick(item.query)}
                  >
                    <div className="p-2 pr-8 min-w-0">
                      <p className="text-sm line-clamp-2 text-foreground break-words">
                        {item.query}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimestamp(item.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
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
        <div className="mt-4 py-3">
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
      <div className="mt-auto px-4 py-4 border-t border-border/30 shrink-0">
        <TooltipProvider delayDuration={0}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
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
            <div className="flex items-center gap-2 text-sm min-w-0">
              <div
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  isLoading
                    ? "bg-yellow-500 animate-pulse"
                    : health?.status === "healthy"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-muted-foreground truncate">
                {isLoading ? "Connecting" : health?.status === "healthy" ? "Connected" : "Offline"}
              </span>
            </div>
          )}
        </TooltipProvider>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showClearBookmarksDialog}
        onOpenChange={setShowClearBookmarksDialog}
        onConfirm={clearBookmarks}
        title="Clear All Bookmarks?"
        description={`Are you sure you want to remove all ${bookmarkCount} bookmark${bookmarkCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Clear Bookmarks"
        cancelText="Cancel"
        variant="destructive"
        icon={
          <div className="rounded-full p-2 bg-red-500/10 text-red-500">
            <Trash2 className="h-5 w-5" />
          </div>
        }
      />

      <ConfirmDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
        onConfirm={clearSearchHistory}
        title="Clear Search History?"
        description={`Are you sure you want to clear all ${searchHistory.length} search ${searchHistory.length !== 1 ? 'entries' : 'entry'}? This action cannot be undone.`}
        confirmText="Clear History"
        cancelText="Cancel"
        variant="destructive"
        icon={
          <div className="rounded-full p-2 bg-red-500/10 text-red-500">
            <Trash2 className="h-5 w-5" />
          </div>
        }
      />
    </div>
  );
}

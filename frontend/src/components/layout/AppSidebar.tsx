import { Home, Search, GitCompare, FileText, Library } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Search Standards",
    url: "/search",
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
}

export function AppSidebar({ isCollapsed }: AppSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-background">
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
    </div>
  );
}

import { Home, Search, GitCompare, FileText, Library } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

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

export function AppSidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-4">
        <h2 className="mb-2 px-4 text-sm font-semibold text-muted-foreground">
          Navigation
        </h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

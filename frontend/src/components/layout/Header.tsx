import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      {/* Global Search Bar */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search standards... (Ctrl/⌘ + K)"
            className="w-full pl-10 pr-4"
          />
        </div>
      </div>

      {/* User Menu/Help Icon */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <span className="sr-only">Help</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </Button>
      </div>
    </header>
  );
}

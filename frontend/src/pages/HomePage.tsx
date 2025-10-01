import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command as CommandIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
      {/* Branding Section */}
      <div className="text-center mb-16">
        <h1 className="text-6xl font-bold mb-4 tracking-tight">PMWiki</h1>
        <p className="text-lg text-muted-foreground">
          Citation-focused search for PM standards
        </p>
      </div>

      {/* Search Input Section */}
      <form onSubmit={handleSearch} className="w-full max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Ask a question... (e.g., 'How does PMBOK handle risk management?')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-4 text-base shadow-sm"
          />
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <span>Press</span>
          <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
            <CommandIcon className="h-3 w-3" />K
          </kbd>
          <span>to focus</span>
        </div>
      </form>
    </div>
  );
}

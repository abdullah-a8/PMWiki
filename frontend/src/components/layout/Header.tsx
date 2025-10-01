import { Menu, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
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

      {/* Help Icon */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </div>
    </header>
  );
}

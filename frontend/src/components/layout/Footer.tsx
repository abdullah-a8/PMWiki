export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 text-sm text-muted-foreground">
        <p>&copy; {currentYear} PMWiki. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition-colors">
            About
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Help
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

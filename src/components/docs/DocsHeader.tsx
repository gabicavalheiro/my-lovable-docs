import { Link } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";

export function DocsHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-background flex items-center px-4 gap-4 sticky top-0 z-50">
      <Link to="/" className="flex items-center gap-1.5 mr-4 flex-shrink-0">
        <span className="text-lg font-bold text-emerald-400 tracking-tight">velo</span>
      </Link>

      <div className="flex-1 flex justify-center">
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 px-4 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors w-full max-w-md text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border text-xs text-muted-foreground font-mono">
            Ctrl K
          </kbd>
        </button>
      </div>

      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-muted-foreground flex-shrink-0">
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Perguntar</span>
      </button>
    </header>
  );
}
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchModal } from "@/components/docs/SearchModal";

export function DocsHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-background flex items-center px-6 sticky top-0 z-40">
        <div className="w-[260px] flex-shrink-0 flex items-center">
          <Link to="/">
            <span className="text-lg font-bold tracking-tight" style={{ color: "#9768ED" }}>
              velo
            </span>
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors w-full max-w-md text-sm text-muted-foreground"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border text-xs text-muted-foreground font-mono">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="w-[260px] flex-shrink-0 flex justify-end">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 transition-colors text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Perguntar</span>
          </button>
        </div>
      </header>

      <SearchModal
        open={open}
        query={query}
        onQueryChange={setQuery}
        onClose={handleClose}
      />
    </>
  );
}
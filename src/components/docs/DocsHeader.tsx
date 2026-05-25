import { Link } from "react-router-dom";
import { Search, Sparkles, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchModal } from "@/components/docs/SearchModal";

export function DocsHeader() {
  const [open, setOpen]   = useState(false);
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

  const handleClose = () => { setOpen(false); setQuery(""); };

  return (
    <>
      <header
        className="h-14 border-b border-border bg-background flex items-center px-6 sticky top-0 z-40"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {/* Logo */}
        <div className="w-[260px] flex-shrink-0 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 group">
            {/* Ícone gradiente */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--brand-gradient)" }}
            >
              <span className="text-white text-xs font-black">V</span>
            </div>
            {/* Nome com gradiente */}
            <span
              className="text-lg font-black tracking-tight brand-text"
              style={{ letterSpacing: "-0.03em" }}
            >
              velo
            </span>
          </Link>
        </div>

        {/* Busca central */}
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

        {/* Ações direita */}
        <div className="w-[260px] flex-shrink-0 flex items-center justify-end gap-2">
          {/* Link Academia */}
          <Link
            to="/academia"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-px"
            style={{ background: "var(--brand-gradient)", color: "#fff" }}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Academia
          </Link>

          {/* Botão Perguntar */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
            style={{
              borderColor: "rgba(91,33,182,0.3)",
              color: "#5b21b6",
              background: "rgba(91,33,182,0.06)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--brand-gradient)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(91,33,182,0.06)";
              (e.currentTarget as HTMLButtonElement).style.color = "#5b21b6";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(91,33,182,0.3)";
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Perguntar
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
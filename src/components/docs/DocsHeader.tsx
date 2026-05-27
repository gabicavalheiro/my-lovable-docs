import { Link } from "react-router-dom";
import { Search, GitBranch, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { SearchModal } from "@/components/docs/SearchModal";
import { UserMenu } from "@/components/UserMenu";


export function DocsHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => { setOpen(false); setQuery(""); };

  return (

    <>
      <style>{`
  @media (max-width: 768px) {
    .velo-hide-mobile { display: none !important; }
  }
`}</style>
      <header className="h-14 border-b border-border bg-background flex items-center px-6 sticky top-0 z-40">
        {/* Logo */}
        <div className="w-[260px] flex-shrink-0 flex items-center">
          <Link to="/" className="flex items-center" aria-label="Velo — Página inicial">
            <img src="/velo-logo.png" alt="Velo" style={{ height: 32, width: "auto" }} />
          </Link>
        </div>

        {/* Busca */}
        <div className="flex-1 flex justify-center">
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors w-full max-w-md text-sm text-muted-foreground">
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border text-xs text-muted-foreground font-mono">Ctrl K</kbd>
          </button>
        </div>

        {/* Ações — ambos usam brand gradient */}
        <div className="w-[280px] flex-shrink-0 flex items-center justify-end gap-2">

          <UserMenu navLinkSize="0.78rem" />

          <Link to="/diagnosticos"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 velo-hide-mobile"
            style={{ background: "var(--brand-gradient)", color: "#fff" }}>
            <GitBranch className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Diagnósticos</span>
          </Link>

          <Link to="/academia"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 velo-hide-mobile"
            style={{ background: "var(--brand-gradient)", color: "#fff" }}>
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Academia</span>
          </Link>
        </div>
      </header>

      <SearchModal open={open} query={query} onQueryChange={setQuery} onClose={handleClose} />
    </>
  );
}
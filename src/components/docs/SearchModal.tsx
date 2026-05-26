import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, FileText } from "lucide-react";
import { useDocSearch, highlightMatch, type SearchResult } from "@/hooks/useDocSearch";

/* ─── Debounce local ────────────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─── Highlight ──────────────────────────────────────────────────────────── */
function Hl({ text, query }: { text: string; query: string }) {
  const parts = highlightMatch(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.hl ? (
          <mark key={i} className="bg-transparent text-foreground font-bold underline decoration-primary/60 decoration-2">{p.text}</mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

function Breadcrumb({ modTitle, parentTitle }: { modTitle: string; parentTitle: string | null }) {
  return (
    <div className="flex items-center gap-1 flex-wrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-0.5">
      <span>{modTitle}</span>
      {parentTitle && <><ChevronRight className="h-2.5 w-2.5" /><span>{parentTitle}</span></>}
    </div>
  );
}

interface SearchModalProps { open: boolean; query: string; onQueryChange: (q: string) => void; onClose: () => void; }

export function SearchModal({ open, query, onQueryChange, onClose }: SearchModalProps) {
  const navigate  = useNavigate();
  const inputRef  = useRef<HTMLInputElement>(null);

  // Debounce: só roda a busca 200ms após parar de digitar
  const debouncedQuery = useDebounce(query, 200);
  const results = useDocSearch(debouncedQuery);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (modSlug: string, pageSlug: string, anchor?: string | null) => {
    onClose();
    navigate(`/docs/${modSlug}/${pageSlug}${anchor ? `#${anchor}` : ""}`);
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
  };

  const [first, ...rest] = results;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input ref={inputRef} value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar na documentação..."
            className="flex-1 py-4 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
          <button onClick={onClose}
            className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors flex-shrink-0">ESC</button>
        </div>

        {/* Resultados */}
        <div className="overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          {debouncedQuery.trim().length < 2 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Digite ao menos 2 caracteres para buscar.</div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum resultado para "{debouncedQuery}".</div>
          ) : (
            <>
              {first && <ResultBlock result={first} query={debouncedQuery} featured onSelect={handleSelect} />}
              {rest.map((r) => <ResultBlock key={r.page.id} result={r} query={debouncedQuery} onSelect={handleSelect} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBlock({ result, query, featured = false, onSelect }: {
  result: SearchResult; query: string; featured?: boolean;
  onSelect: (modSlug: string, pageSlug: string, anchor?: string | null) => void;
}) {
  const { page, modTitle, modSlug, parentTitle, hits, titleMatch } = result;
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => onSelect(modSlug, page.slug, hits[0]?.anchor)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-muted/50"
        style={featured ? { background: "hsl(var(--primary) / 0.06)" } : {}}>
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Breadcrumb modTitle={modTitle} parentTitle={parentTitle} />
          <p className={`text-sm leading-snug ${featured ? "font-semibold text-foreground" : "text-foreground/90"} truncate`}>
            <Hl text={page.title} query={query} />
          </p>
        </div>
      </button>
      {hits.slice(0, featured ? 2 : 1).map((hit, i) => (
        <button key={i} onClick={() => onSelect(modSlug, page.slug, hit.anchor)}
          className="w-full text-left pl-11 pr-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors leading-relaxed">
          <Hl text={hit.text} query={query} />
        </button>
      ))}
    </div>
  );
}
import { Link } from "react-router-dom";
import { BookOpen, FileText, ArrowRight, Search, GraduationCap, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useModules, useAllPages } from "@/hooks/useDocData";
import { SearchModal } from "@/components/docs/SearchModal";
import { useMemo } from "react";

export default function Index() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");

  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleClose = () => { setOpen(false); setQuery(""); };

  const getFirstPage  = (moduleId: string) => allPages?.find((p) => p.module_id === moduleId && !p.parent_page_id);
  const getPageCount  = (moduleId: string) => allPages?.filter((p) => p.module_id === moduleId).length ?? 0;

  const rootModules = useMemo(
    () => modules?.filter((m) => !(m as any).parent_module_id) ?? [],
    [modules]
  );

  const academiaCount = useMemo(
    () => (allPages ?? []).filter((p) => (p as any).academia_content?.steps?.length > 0).length,
    [allPages]
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 90% 80% at 0% 0%, hsl(262 60% 28% / 0.55) 0%, transparent 65%)," +
          "radial-gradient(ellipse 80% 70% at 100% 100%, hsl(25 100% 40% / 0.18) 0%, transparent 60%)," +
          "hsl(240 5% 8%)",
        color: "hsl(0 0% 92%)",
      }}
    >
      {/* ── Header ── */}
      <header
        className="h-14 flex items-center px-6 sticky top-0 z-40"
        style={{
          background: "hsl(240 5% 8% / 0.85)",
          borderBottom: "1px solid hsl(240 5% 16%)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Logo */}
        <div className="w-[260px] flex-shrink-0 flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--brand-gradient)" }}
          >
            <span className="text-white text-xs font-black">V</span>
          </div>
          <span className="text-lg font-black tracking-tight brand-text" style={{ letterSpacing: "-0.03em" }}>
            velo
          </span>
        </div>

        {/* Busca */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 px-4 py-1.5 rounded-lg w-full max-w-md text-sm transition-colors"
            style={{
              border: "1px solid hsl(240 5% 16%)",
              background: "hsl(240 5% 13% / 0.8)",
              color: "hsl(240 4% 52%)",
            }}
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: "hsl(240 5% 8%)", border: "1px solid hsl(240 5% 16%)" }}>
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Ações */}
        <div className="w-[260px] flex-shrink-0 flex items-center justify-end gap-2">
          <Link
            to="/academia"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--brand-gradient)", color: "#fff" }}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Academia
          </Link>
          <Link
            to="/docs"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ border: "1px solid hsl(240 5% 22%)", color: "hsl(0 0% 75%)" }}
          >
            Ver docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center px-6 pt-24 pb-16">
        <div className="text-center max-w-2xl mb-20">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-6 uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, rgba(91,33,182,0.2) 0%, rgba(255,107,0,0.15) 100%)",
              border: "1px solid rgba(91,33,182,0.4)",
              color: "hsl(262 70% 72%)",
            }}
          >
            Central de documentação
          </div>

          {/* Título */}
          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight" style={{ color: "hsl(0 0% 96%)" }}>
            Bem-vindo ao{" "}
            <span className="brand-text">Velo</span>
          </h1>

          <p className="text-lg leading-relaxed" style={{ color: "hsl(240 4% 52%)" }}>
            Tudo que você precisa saber sobre o Velo — guias, integrações,
            configurações e referências técnicas em um só lugar.
          </p>

          {/* CTAs */}
          <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
            <Link
              to="/docs"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: "var(--brand-gradient)", color: "#fff", boxShadow: "0 4px 20px rgba(91,33,182,0.3)" }}
            >
              Começar a ler <ArrowRight className="h-4 w-4" />
            </Link>

            {academiaCount > 0 && (
              <Link
                to="/academia"
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
                style={{
                  border: "1px solid rgba(91,33,182,0.4)",
                  color: "hsl(262 70% 72%)",
                  background: "rgba(91,33,182,0.08)",
                }}
              >
                <GraduationCap className="h-4 w-4" />
                Academia IA
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(91,33,182,0.3)", color: "hsl(262 70% 85%)" }}
                >
                  {academiaCount}
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Cards de módulos ── */}
        {rootModules.length > 0 && (
          <div className="w-full max-w-4xl">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: "hsl(240 4% 40%)" }}
            >
              Módulos de documentação
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {rootModules.map((mod) => {
                const firstPage = getFirstPage(mod.id);
                const pageCount = getPageCount(mod.id);
                const href = firstPage ? `/docs/${(mod as any).slug}/${firstPage.slug}` : `/docs`;

                return (
                  <Link
                    key={mod.id}
                    to={href}
                    className="group flex items-center gap-4 p-4 rounded-xl transition-all"
                    style={{
                      border: "1px solid hsl(240 5% 16%)",
                      background: "hsl(240 5% 10% / 0.6)",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(91,33,182,0.5)";
                      (e.currentTarget as HTMLAnchorElement).style.background  = "hsl(240 5% 11%)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(240 5% 16%)";
                      (e.currentTarget as HTMLAnchorElement).style.background  = "hsl(240 5% 10% / 0.6)";
                    }}
                  >
                    {/* Ícone com gradiente */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "hsl(0 0% 90%)" }}>
                        {(mod as any).title}
                      </p>
                      {(mod as any).description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "hsl(240 4% 50%)" }}>
                          {(mod as any).description}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-xs mt-1" style={{ color: "hsl(240 4% 42%)" }}>
                        <FileText className="h-3 w-3" />
                        {pageCount} página{pageCount !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Seta laranja */}
                    <ChevronRight
                      className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1"
                      style={{ color: "#ff6b00" }}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {modules && modules.length === 0 && (
          <div
            className="text-center py-20 rounded-xl w-full max-w-md"
            style={{ border: "1px dashed hsl(240 5% 20%)", color: "hsl(240 4% 40%)" }}
          >
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum módulo publicado ainda.</p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-5 text-center text-xs"
        style={{ borderTop: "1px solid hsl(240 5% 14%)", color: "hsl(240 4% 35%)" }}
      >
        © {new Date().getFullYear()} Velo · Documentação oficial
      </footer>

      <SearchModal open={open} query={query} onQueryChange={setQuery} onClose={handleClose} />
    </div>
  );
}
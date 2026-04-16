import { Link, useNavigate } from "react-router-dom";
import { BookOpen, FileText, ArrowRight, Search, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useModules, useAllPages } from "@/hooks/useDocData";
import { SearchModal } from "@/components/docs/SearchModal";

export default function Index() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();

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

  const getFirstPage = (moduleId: string) =>
    allPages?.find((p) => p.module_id === moduleId && !p.parent_page_id);

  const getPageCount = (moduleId: string) =>
    allPages?.filter((p) => p.module_id === moduleId).length ?? 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 90% 80% at 0% 0%, hsl(262 60% 28% / 0.55) 0%, transparent 65%), radial-gradient(ellipse 80% 70% at 100% 100%, hsl(262 60% 28% / 0.35) 0%, transparent 60%), hsl(240 5% 8%)",
        color: "hsl(0 0% 92%)",
      }}
    >
      {/* Header */}
      <header
        className="h-14 flex items-center px-6 sticky top-0 z-40"
        style={{
          background: "hsl(240 5% 8% / 0.85)",
          borderBottom: "1px solid hsl(240 5% 16%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="w-[260px] flex-shrink-0 flex items-center">
          <span className="text-lg font-bold tracking-tight" style={{ color: "#9768ED" }}>
            velo
          </span>
        </div>

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
            <kbd
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
              style={{ background: "hsl(240 5% 8%)", border: "1px solid hsl(240 5% 16%)" }}
            >
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="w-[260px] flex-shrink-0 flex justify-end">
          <Link
            to="/docs"
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "hsl(262 70% 65%)", color: "#fff" }}
          >
            Ver docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 pt-24 pb-16">
        <div className="text-center max-w-2xl mb-20">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 uppercase tracking-wider"
            style={{
              background: "hsl(262 70% 65% / 0.12)",
              border: "1px solid hsl(262 70% 65% / 0.25)",
              color: "hsl(262 70% 72%)",
            }}
          >
            Central de documentação
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-5 leading-tight" style={{ color: "hsl(0 0% 96%)" }}>
            Bem-vindo ao <span style={{ color: "#9768ED" }}>Velo</span>
          </h1>

          <p className="text-lg leading-relaxed" style={{ color: "hsl(240 4% 52%)" }}>
            Tudo que você precisa saber sobre o Velo — guias, integrações,
            configurações e referências técnicas em um só lugar.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <Link
              to="/docs"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: "hsl(262 70% 65%)", color: "#fff" }}
            >
              Começar a ler <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Módulos */}
        {modules && modules.length > 0 && (
          <div className="w-full max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "hsl(240 4% 40%)" }}>
              Módulos de documentação
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {modules.map((mod) => {
                const firstPage = getFirstPage(mod.id);
                const pageCount = getPageCount(mod.id);
                const href = firstPage ? `/docs/${mod.slug}/${firstPage.slug}` : "/docs";
                return (
                  <Link
                    key={mod.id}
                    to={href}
                    className="group flex items-start gap-4 p-5 rounded-xl transition-all duration-200"
                    style={{ border: "1px solid hsl(240 5% 15%)", background: "hsl(240 5% 10% / 0.7)" }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = "hsl(262 70% 65% / 0.4)";
                      el.style.background = "hsl(240 5% 12% / 0.9)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLAnchorElement;
                      el.style.borderColor = "hsl(240 5% 15%)";
                      el.style.background = "hsl(240 5% 10% / 0.7)";
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "hsl(262 70% 65% / 0.15)" }}
                    >
                      <BookOpen className="h-5 w-5" style={{ color: "hsl(262 70% 72%)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className="font-semibold text-sm leading-snug truncate transition-colors group-hover:text-purple-400"
                          style={{ color: "hsl(0 0% 92%)" }}
                        >
                          {mod.title}
                        </h3>
                        <ChevronRight
                          className="h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "hsl(262 70% 65%)" }}
                        />
                      </div>
                      {mod.description && (
                        <p className="text-sm mt-1 line-clamp-2 leading-relaxed" style={{ color: "hsl(240 4% 50%)" }}>
                          {mod.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2.5 text-xs" style={{ color: "hsl(240 4% 40%)" }}>
                        <FileText className="h-3 w-3" />
                        {pageCount} {pageCount === 1 ? "página" : "páginas"}
                      </div>
                    </div>
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

      <footer
        className="px-6 py-5 text-center text-xs"
        style={{ borderTop: "1px solid hsl(240 5% 14%)", color: "hsl(240 4% 35%)" }}
      >
        © {new Date().getFullYear()} Velo · Documentação oficial
      </footer>

      <SearchModal
        open={open}
        query={query}
        onQueryChange={setQuery}
        onClose={handleClose}
      />
    </div>
  );
}
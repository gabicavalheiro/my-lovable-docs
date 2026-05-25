import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { useAllPages, useModules } from "@/hooks/useDocData";
import { GraduationCap, Search, BookOpen, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AcademiaIndex() {
  const { data: allPages }  = useAllPages();
  const { data: modules }   = useModules();
  const [search, setSearch] = useState("");

  // Filtra apenas páginas que têm academia gerada
  const academiaPages = useMemo(() => {
    return (allPages ?? []).filter(
      (p) => (p as any).academia_content?.steps?.length > 0
    );
  }, [allPages]);

  // Agrupa por módulo
  const grouped = useMemo(() => {
    const map = new Map<string, typeof academiaPages>();
    academiaPages.forEach((p) => {
      const list = map.get(p.module_id) ?? [];
      list.push(p);
      map.set(p.module_id, list);
    });
    return map;
  }, [academiaPages]);

  const moduleMap = useMemo(
    () => new Map((modules ?? []).map((m) => [m.id, m])),
    [modules]
  );

  const totalQuestions = useMemo(() => {
    return academiaPages.reduce((acc, p) => {
      const steps = (p as any).academia_content?.steps ?? [];
      return acc + steps.filter((s: any) => s.type === "quiz").length;
    }, 0);
  }, [academiaPages]);

  // Aplica filtro de busca
  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    const entries = [...grouped.entries()];
    if (!q) return entries;
    return entries
      .map(([modId, pages]) => [
        modId,
        pages.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (moduleMap.get(modId)?.title ?? "").toLowerCase().includes(q)
        ),
      ] as [string, typeof academiaPages])
      .filter(([, pages]) => pages.length > 0);
  }, [grouped, search, moduleMap]);

  return (
    <DocsLayout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">

          {/* ── Hero ── */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="p-2.5 rounded-xl"
                style={{ background: "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)" }}
              >
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1
                className="text-3xl font-extrabold"
                style={{
                  background: "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Academia
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mb-5">
              Teste seus conhecimentos sobre cada módulo da documentação.
            </p>

            {/* Stats */}
            {academiaPages.length > 0 && (
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2">
                  <GraduationCap className="h-4 w-4 text-violet-500" />
                  <span><strong className="text-foreground">{academiaPages.length}</strong> tópicos disponíveis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <span><strong className="text-foreground">{totalQuestions}</strong> perguntas no total</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Empty state ── */}
          {academiaPages.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-xl">
              <GraduationCap className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Nenhuma Academia gerada ainda</p>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Acesse o painel Admin, abra uma página e clique em{" "}
                <strong>✨ Gerar Academia IA</strong> para criar o quiz dessa página.
              </p>
            </div>
          ) : (
            <>
              {/* Busca */}
              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por módulo ou tópico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Grupos por módulo */}
              {filteredEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  Nenhum resultado para "{search}".
                </p>
              ) : (
                <div className="space-y-8">
                  {filteredEntries.map(([modId, pages]) => {
                    const mod = moduleMap.get(modId);
                    if (!mod) return null;
                    return (
                      <section key={modId}>
                        {/* Cabeçalho do módulo */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <h2 className="text-base font-semibold text-foreground">{mod.title}</h2>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {pages.length} tópico{pages.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {pages.map((page) => {
                            const steps = (page as any).academia_content?.steps ?? [];
                            const qCount = steps.filter((s: any) => s.type === "quiz").length;
                            const href = `/docs/${mod.slug}/${page.slug}?tab=academia`;

                            return (
                              <Link
                                key={page.id}
                                to={href}
                                className="group border border-border rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-background"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground group-hover:text-violet-700 transition-colors truncate">
                                      {page.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <GraduationCap className="h-3 w-3" />
                                      {qCount} pergunta{qCount !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  <div
                                    className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white opacity-90 group-hover:opacity-100 transition-opacity"
                                    style={{ background: "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)" }}
                                  >
                                    Iniciar <ChevronRight className="h-3 w-3" />
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </DocsLayout>
  );
}

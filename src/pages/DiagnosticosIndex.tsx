import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { useDiagnosticPages, useModules } from "@/hooks/useDocData";
import { GitBranch, Search, BookOpen, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function DiagnosticosIndex() {
  const { data: pages }   = useDiagnosticPages(); // staleTime:0, busca só as com diagnostic
  const { data: modules } = useModules();
  const [search, setSearch] = useState("");

  const moduleMap = useMemo(() => new Map((modules ?? []).map((m) => [m.id, m])), [modules]);

  const totalSteps = useMemo(() => {
    return (pages ?? []).reduce((acc, p) => acc + ((p as any).diagnostic_content?.steps?.length ?? 0), 0);
  }, [pages]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof pages>();
    (pages ?? []).forEach((p) => {
      const list = map.get(p.module_id) ?? [];
      list!.push(p);
      map.set(p.module_id, list);
    });
    return map;
  }, [pages]);

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase().trim();
    const entries = [...grouped.entries()];
    if (!q) return entries;
    return entries
      .map(([modId, ps]) => [modId, ps!.filter((p) =>
        p.title.toLowerCase().includes(q) || (moduleMap.get(modId)?.title ?? "").toLowerCase().includes(q)
      )] as [string, typeof pages])
      .filter(([, ps]) => ps!.length > 0);
  }, [grouped, search, moduleMap]);

  return (
    <DocsLayout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-8 py-10">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl" style={{ background: "var(--brand-gradient)" }}>
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold"
                style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Diagnósticos
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mb-5">Identifique sua dúvida e siga o caminho certo para resolvê-la.</p>
            {(pages?.length ?? 0) > 0 && (
              <div className="flex gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2">
                  <GitBranch className="h-4 w-4 text-violet-500" />
                  <span><strong className="text-foreground">{pages?.length}</strong> fluxos disponíveis</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2">
                  <BookOpen className="h-4 w-4 text-orange-500" />
                  <span><strong className="text-foreground">{totalSteps}</strong> passos no total</span>
                </div>
              </div>
            )}
          </div>

          {(pages?.length ?? 0) === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-xl">
              <GitBranch className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">Nenhum Diagnóstico gerado ainda</p>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Acesse o painel Admin, abra uma página e clique em <strong>🔍 Gerar Diagnóstico IA</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="relative mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por módulo ou tópico..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              {filteredEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Nenhum resultado para "{search}".</p>
              ) : (
                <div className="space-y-8">
                  {filteredEntries.map(([modId, ps]) => {
                    const mod = moduleMap.get(modId);
                    if (!mod) return null;
                    return (
                      <section key={modId}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 rounded-md bg-violet-500/10"><BookOpen className="h-4 w-4 text-violet-600" /></div>
                          <h2 className="text-base font-semibold text-foreground">{mod.title}</h2>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{ps!.length} fluxo{ps!.length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {ps!.map((page) => {
                            const steps = (page as any).diagnostic_content?.steps ?? [];
                            return (
                              <Link key={page.id} to={`/docs/${mod.slug}/${page.slug}?tab=diagnostic`}
                                className="group border border-border rounded-xl p-5 hover:border-violet-300 hover:shadow-md transition-all bg-background">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-foreground group-hover:text-violet-700 transition-colors truncate">{page.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <GitBranch className="h-3 w-3" />{steps.length} passo{steps.length !== 1 ? "s" : ""} no fluxo
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-violet-500 transition-colors flex-shrink-0 mt-0.5" />
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
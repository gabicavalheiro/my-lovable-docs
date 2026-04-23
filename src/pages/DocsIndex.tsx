import { DocsLayout } from "@/components/docs/DocsLayout";
import { useModules, useAllPages } from "@/hooks/useDocData";
import { Link } from "react-router-dom";
import { BookOpen, FileText, FolderOpen } from "lucide-react";
import { useMemo } from "react";

export default function DocsIndex() {
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();

  const rootModules = useMemo(
    () => modules?.filter((m) => !m.parent_module_id) ?? [],
    [modules]
  );

  const subModulesOf = (parentId: string) =>
    modules?.filter((m) => m.parent_module_id === parentId) ?? [];

  const getFirstPage = (moduleId: string) =>
    allPages?.find((p) => p.module_id === moduleId && !p.parent_page_id);

  const getPageCount = (moduleId: string) =>
    allPages?.filter((p) => p.module_id === moduleId).length || 0;

  return (
    <DocsLayout>
      <main className="flex-1 px-8 py-10 max-w-[960px] mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Documentação</h1>
          <p className="text-muted-foreground text-lg">Selecione um módulo abaixo para começar.</p>
        </div>

        {rootModules.length > 0 ? (
          <div className="space-y-8">
            {rootModules.map((mod) => {
              const subs = subModulesOf(mod.id);
              const firstPage = getFirstPage(mod.id);
              const pageCount = getPageCount(mod.id);
              const href = firstPage ? `/docs/${mod.slug}/${firstPage.slug}` : `/docs`;

              return (
                <div key={mod.id}>
                  {/* Módulo raiz */}
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {mod.title}
                    </h2>
                    {mod.description && (
                      <span className="text-sm text-muted-foreground/60">— {mod.description}</span>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {/* Card do próprio módulo se tiver páginas diretas */}
                    {pageCount > 0 && (
                      <Link
                        to={href}
                        className="group border border-border rounded-lg p-5 hover:border-primary/40 hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {mod.title}
                            </h3>
                            {mod.description && (
                              <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {pageCount} página{pageCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}

                    {/* Cards dos submódulos */}
                    {subs.map((sub) => {
                      const subFirst = getFirstPage(sub.id);
                      const subCount = getPageCount(sub.id);
                      const subHref = subFirst ? `/docs/${sub.slug}/${subFirst.slug}` : `/docs`;
                      return (
                        <Link
                          key={sub.id}
                          to={subHref}
                          className="group border border-border rounded-lg p-5 hover:border-primary/40 hover:bg-muted/30 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {sub.title}
                              </h3>
                              {sub.description && (
                                <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {subCount} página{subCount !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Nenhum módulo encontrado.</p>
          </div>
        )}
      </main>
    </DocsLayout>
  );
}
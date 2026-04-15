import { DocSidebar } from "@/components/docs/DocSidebar";
import { useModules, useAllPages } from "@/hooks/useDocData";
import { Link } from "react-router-dom";
import { FileText, BookOpen } from "lucide-react";

export default function DocsIndex() {
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();

  const getPageCount = (moduleId: string) =>
    allPages?.filter((p) => p.module_id === moduleId).length || 0;

  return (
    <div className="flex min-h-screen">
      <DocSidebar />
      <main className="flex-1 px-8 py-10 max-w-[960px] mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Documentação</h1>
          <p className="text-muted-foreground text-lg">
            Selecione um módulo abaixo para começar.
          </p>
        </div>

        {modules && modules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((mod) => {
              const firstPage = allPages?.find(
                (p) => p.module_id === mod.id && !p.parent_page_id
              );
              return (
                <Link
                  key={mod.id}
                  to={
                    firstPage
                      ? `/docs/${mod.slug}/${firstPage.slug}`
                      : `/docs`
                  }
                  className="group border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-secondary">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {mod.title}
                      </h3>
                      {mod.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {mod.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getPageCount(mod.id)} páginas
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p>Nenhum módulo encontrado.</p>
            <p className="text-sm mt-1">
              Acesse o <Link to="/admin" className="text-primary underline">painel admin</Link> para criar módulos e páginas.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

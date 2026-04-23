import { useParams } from "react-router-dom";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocTableOfContents } from "@/components/docs/DocTableOfContents";
import { MarkdownRenderer } from "@/components/docs/MarkdownRenderer";
import { usePageBySlug } from "@/hooks/useDocData";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocsPage() {
  const { moduleSlug, pageSlug } = useParams();
  const { data: page, isLoading } = usePageBySlug(moduleSlug, pageSlug);

  return (
    <DocsLayout>
      {/* flex-1 + min-w-0 garante que o conteúdo não empurra o TOC pra fora */}
      <div className="flex flex-1 min-w-0 min-h-0">
        {/* Conteúdo principal — tem seu próprio scroll */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full max-w-[720px] mx-auto px-8 py-10">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : page ? (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-6">{page.title}</h1>
                <MarkdownRenderer content={page.content} />
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  {moduleSlug && pageSlug
                    ? "Página não encontrada."
                    : "Selecione uma página na barra lateral."}
                </p>
              </div>
            )}
          </div>
        </main>

        {/* TOC — sempre renderizado quando há página, com scroll próprio */}
        <DocTableOfContents content={page?.content ?? ""} />
      </div>
    </DocsLayout>
  );
}
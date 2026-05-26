import { useState, lazy, Suspense } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocTableOfContents } from "@/components/docs/DocTableOfContents";
import { MarkdownRenderer } from "@/components/docs/MarkdownRenderer";
import { usePageBySlug } from "@/hooks/useDocData";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, GraduationCap, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

// Carregados sob demanda — só quando o usuário clica na aba
const DocAcademia    = lazy(() => import("@/components/docs/DocAcademia").then((m) => ({ default: m.DocAcademia })));
const DiagnosticFlow = lazy(() => import("@/components/docs/DiagnosticFlow").then((m) => ({ default: m.DiagnosticFlow })));

type Tab = "content" | "diagnostic" | "academia";

function TabSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export default function DocsPage() {
  const { moduleSlug, pageSlug } = useParams();
  const [searchParams]            = useSearchParams();
  const { data: page, isLoading } = usePageBySlug(moduleSlug, pageSlug);

  const [tab, setTab] = useState<Tab>(() => {
    const p = searchParams.get("tab");
    if (p === "academia")   return "academia";
    if (p === "diagnostic") return "diagnostic";
    return "content";
  });

  const academiaData   = (page as any)?.academia_content;
  const diagnosticData = (page as any)?.diagnostic_content;
  const hasAcademia    = Boolean(academiaData?.steps?.length);
  const hasDiagnostic  = Boolean(diagnosticData?.steps?.length);
  const hasExtras      = hasAcademia || hasDiagnostic;

  return (
    <DocsLayout>
      <div className="flex flex-1 min-w-0 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="w-full max-w-[720px] mx-auto px-8 py-10">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : page ? (
              <>
                <h1 className="text-3xl font-bold text-foreground mb-4">{page.title}</h1>

                {hasExtras && (
                  <div className="flex gap-1 mb-8 border-b border-border">
                    <TabBtn active={tab === "content"} onClick={() => setTab("content")}
                      icon={<BookOpen className="h-4 w-4" />} label="Conteúdo"
                      activeColor="border-primary text-primary" />
                    {hasDiagnostic && (
                      <TabBtn active={tab === "diagnostic"} onClick={() => setTab("diagnostic")}
                        icon={<GitBranch className="h-4 w-4" />} label="Diagnóstico"
                        activeColor="border-violet-500 text-violet-600" badgeClass="bg-violet-100 text-violet-700" />
                    )}
                    {hasAcademia && (
                      <TabBtn active={tab === "academia"} onClick={() => setTab("academia")}
                        icon={<GraduationCap className="h-4 w-4" />} label="Academia"
                        activeColor="border-violet-500 text-violet-600" badgeClass="bg-violet-100 text-violet-700" />
                    )}
                  </div>
                )}

                {tab === "content" && <MarkdownRenderer content={page.content} />}

                {tab === "diagnostic" && diagnosticData && (
                  <Suspense fallback={<TabSkeleton />}>
                    <DiagnosticFlow data={diagnosticData} />
                  </Suspense>
                )}

                {tab === "academia" && academiaData && (
                  <Suspense fallback={<TabSkeleton />}>
                    <DocAcademia data={academiaData} />
                  </Suspense>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">
                  {moduleSlug && pageSlug ? "Página não encontrada." : "Selecione uma página na barra lateral."}
                </p>
              </div>
            )}
          </div>
        </main>
        {tab === "content" && <DocTableOfContents content={page?.content ?? ""} />}
      </div>
    </DocsLayout>
  );
}

function TabBtn({ active, onClick, icon, label, badge, activeColor, badgeClass }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; badge?: string; activeColor: string; badgeClass?: string;
}) {
  return (
    <button onClick={onClick}
      className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
        active ? `${activeColor} border-current` : "border-transparent text-muted-foreground hover:text-foreground hover:border-border")}>
      {icon}
      {label}
      {badge && (
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", badgeClass)}>{badge}</span>
      )}
    </button>
  );
}
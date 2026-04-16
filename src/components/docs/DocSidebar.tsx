import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { useModules, useAllPages, type DocModule, type DocPage } from "@/hooks/useDocData";
import { cn } from "@/lib/utils";

export function DocSidebar() {
  const { moduleSlug, pageSlug } = useParams();
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const pagesByModule = useMemo(() => {
    if (!allPages) return {};
    const map: Record<string, DocPage[]> = {};
    allPages.forEach((p) => {
      if (!map[p.module_id]) map[p.module_id] = [];
      map[p.module_id].push(p);
    });
    return map;
  }, [allPages]);

  const toggleModule = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Auto-expand active module
  const activeModule = modules?.find((m) => m.slug === moduleSlug);
  if (activeModule && expanded[activeModule.id] === undefined) {
    expanded[activeModule.id] = true;
  }

  const buildTree = (pages: DocPage[]) => {
    const roots = pages.filter((p) => !p.parent_page_id);
    const children = (parentId: string) =>
      pages.filter((p) => p.parent_page_id === parentId);
    return { roots, children };
  };

  return (
    <aside className="w-[260px] min-h-0 border-r border-border bg-doc-sidebar flex-shrink-0 flex flex-col overflow-y-auto">
      <nav className="flex-1 py-3">
        {modules?.map((mod) => {
          const isExpanded = expanded[mod.id] ?? false;
          const pages = pagesByModule[mod.id] || [];
          const { roots, children } = buildTree(pages);

          return (
            <div key={mod.id} className="mb-0.5">
              <button
                onClick={() => toggleModule(mod.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>{mod.title}</span>
              </button>

              {isExpanded && (
                <div className="ml-2">
                  {roots.map((page) => (
                    <PageLink
                      key={page.id}
                      page={page}
                      moduleSlug={mod.slug}
                      activePageSlug={pageSlug}
                      childPages={children(page.id)}
                      allChildren={children}
                      currentModuleSlug={moduleSlug}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function PageLink({
  page,
  moduleSlug,
  activePageSlug,
  childPages,
  allChildren,
  currentModuleSlug,
}: {
  page: DocPage;
  moduleSlug: string;
  activePageSlug?: string;
  childPages: DocPage[];
  allChildren: (parentId: string) => DocPage[];
  currentModuleSlug?: string;
}) {
  const isActive = moduleSlug === currentModuleSlug && page.slug === activePageSlug;
  const [open, setOpen] = useState(isActive || childPages.some(c => c.slug === activePageSlug));

  return (
    <div>
      <div className="flex items-center group">
        {childPages.length > 0 && (
          <button onClick={() => setOpen(!open)} className="p-1 text-muted-foreground hover:text-foreground">
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <Link
          to={`/docs/${moduleSlug}/${page.slug}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors flex-1",
            isActive
              ? "bg-primary/15 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <span className="truncate">{page.title}</span>
        </Link>
      </div>
      {open && childPages.length > 0 && (
        <div className="ml-4 border-l border-border">
          {childPages.map((child) => (
            <PageLink
              key={child.id}
              page={child}
              moduleSlug={moduleSlug}
              activePageSlug={activePageSlug}
              childPages={allChildren(child.id)}
              allChildren={allChildren}
              currentModuleSlug={currentModuleSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
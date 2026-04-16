import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useModules, useAllPages, type DocPage } from "@/hooks/useDocData";
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
      <nav className="flex-1 py-4 px-3">
        {modules?.map((mod) => {
          const isExpanded = expanded[mod.id] ?? false;
          const pages = pagesByModule[mod.id] || [];
          const { roots, children } = buildTree(pages);

          return (
            <div key={mod.id} className="mb-4">
              {/* Título do módulo */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/30"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="truncate text-left">{mod.title}</span>
              </button>

              {/* Páginas do módulo */}
              {isExpanded && roots.length > 0 && (
                <div className="space-y-0.5">
                  {roots.map((page) => (
                    <PageLink
                      key={page.id}
                      page={page}
                      moduleSlug={mod.slug}
                      activePageSlug={pageSlug}
                      childPages={children(page.id)}
                      allChildren={children}
                      currentModuleSlug={moduleSlug}
                      depth={0}
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
  depth,
}: {
  page: DocPage;
  moduleSlug: string;
  activePageSlug?: string;
  childPages: DocPage[];
  allChildren: (parentId: string) => DocPage[];
  currentModuleSlug?: string;
  depth: number;
}) {
  const isActive = moduleSlug === currentModuleSlug && page.slug === activePageSlug;
  const [open, setOpen] = useState(
    isActive || childPages.some((c) => c.slug === activePageSlug)
  );

  return (
    <div>
      <div className="flex items-center">
        {/* Indentação por nível */}
        {depth > 0 && (
          <div
            className="flex-shrink-0 border-l border-border"
            style={{ width: 16, marginLeft: depth * 12 }}
          />
        )}

        {/* Seta para filhos */}
        {childPages.length > 0 ? (
          <button
            onClick={() => setOpen(!open)}
            className="p-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          /* Espaçador para alinhar com itens que têm seta */
          depth === 0 && <div className="w-5 flex-shrink-0" />
        )}

        <Link
          to={`/docs/${moduleSlug}/${page.slug}`}
          className={cn(
            "flex-1 px-2 py-1.5 text-sm rounded-md transition-colors truncate",
            isActive
              ? "bg-primary/20 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {page.title}
        </Link>
      </div>

      {open && childPages.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {childPages.map((child) => (
            <PageLink
              key={child.id}
              page={child}
              moduleSlug={moduleSlug}
              activePageSlug={activePageSlug}
              childPages={allChildren(child.id)}
              allChildren={allChildren}
              currentModuleSlug={currentModuleSlug}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
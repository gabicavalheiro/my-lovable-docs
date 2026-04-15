import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useModules, useAllPages, type DocModule, type DocPage } from "@/hooks/useDocData";
import { cn } from "@/lib/utils";

export function DocSidebar() {
  const { moduleSlug, pageSlug } = useParams();
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const pagesByModule = useMemo(() => {
    if (!allPages) return {};
    const map: Record<string, DocPage[]> = {};
    allPages.forEach((p) => {
      if (!map[p.module_id]) map[p.module_id] = [];
      map[p.module_id].push(p);
    });
    return map;
  }, [allPages]);

  const filteredModules = useMemo(() => {
    if (!modules) return [];
    if (!search) return modules;
    const lower = search.toLowerCase();
    return modules.filter((m) => {
      if (m.title.toLowerCase().includes(lower)) return true;
      const pages = pagesByModule[m.id] || [];
      return pages.some((p) => p.title.toLowerCase().includes(lower));
    });
  }, [modules, search, pagesByModule]);

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
    <aside className="w-[280px] min-h-screen border-r border-border bg-doc-sidebar flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-border">
        <Link to="/" className="text-lg font-bold text-foreground hover:opacity-80 transition-opacity">
          📖 Docs
        </Link>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        {filteredModules?.map((mod) => {
          const isExpanded = expanded[mod.id] ?? false;
          const pages = pagesByModule[mod.id] || [];
          const { roots, children } = buildTree(pages);

          return (
            <div key={mod.id} className="mb-1">
              <button
                onClick={() => toggleModule(mod.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground hover:bg-doc-hover transition-colors",
                  mod.slug === moduleSlug && "text-primary"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{mod.title}</span>
              </button>

              {isExpanded && (
                <div className="ml-4">
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
      <div className="flex items-center">
        {childPages.length > 0 && (
          <button onClick={() => setOpen(!open)} className="p-1">
            {open ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )}
        <Link
          to={`/docs/${moduleSlug}/${page.slug}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors flex-1",
            isActive
              ? "bg-secondary text-primary font-medium border-l-2 border-primary"
              : "text-muted-foreground hover:bg-doc-hover hover:text-foreground"
          )}
        >
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{page.title}</span>
        </Link>
      </div>
      {open && childPages.length > 0 && (
        <div className="ml-4">
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

import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useState, useMemo } from "react";
import { useModules, useAllPages, type DocModule, type DocPage } from "@/hooks/useDocData";
import { cn } from "@/lib/utils";

export function DocSidebar() {
  const { moduleSlug, pageSlug } = useParams();
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const pagesByModule = useMemo(() => {
    if (!allPages) return {} as Record<string, DocPage[]>;
    const map: Record<string, DocPage[]> = {};
    allPages.forEach((p) => {
      if (!map[p.module_id]) map[p.module_id] = [];
      map[p.module_id].push(p);
    });
    return map;
  }, [allPages]);

  // Separa módulos raiz dos submódulos
  const rootModules = useMemo(
    () => modules?.filter((m) => !m.parent_module_id) ?? [],
    [modules]
  );

  const subModulesOf = (parentId: string) =>
    modules?.filter((m) => m.parent_module_id === parentId) ?? [];

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Expande automaticamente o módulo ativo (e seu pai se for submódulo)
  const activeModule = modules?.find((m) => m.slug === moduleSlug);
  if (activeModule) {
    if (expanded[activeModule.id] === undefined) {
      expanded[activeModule.id] = true;
    }
    if (activeModule.parent_module_id && expanded[activeModule.parent_module_id] === undefined) {
      expanded[activeModule.parent_module_id] = true;
    }
  }

  const buildPageTree = (pages: DocPage[]) => {
    const roots = pages.filter((p) => !p.parent_page_id);
    const children = (parentId: string) => pages.filter((p) => p.parent_page_id === parentId);
    return { roots, children };
  };

  return (
    <aside className="w-[260px] min-h-0 border-r border-border bg-doc-sidebar flex-shrink-0 flex flex-col overflow-y-auto">
      <nav className="flex-1 py-4 px-3">
        {rootModules.map((mod) => (
          <ModuleSection
            key={mod.id}
            mod={mod}
            subModules={subModulesOf(mod.id)}
            subModulesOf={subModulesOf}
            pagesByModule={pagesByModule}
            expanded={expanded}
            toggle={toggle}
            moduleSlug={moduleSlug}
            pageSlug={pageSlug}
            buildPageTree={buildPageTree}
            depth={0}
          />
        ))}
      </nav>
    </aside>
  );
}

// ── Seção de um módulo (recursiva para submódulos) ────────────────────────────

function ModuleSection({
  mod,
  subModules,
  subModulesOf,
  pagesByModule,
  expanded,
  toggle,
  moduleSlug,
  pageSlug,
  buildPageTree,
  depth,
}: {
  mod: DocModule;
  subModules: DocModule[];
  subModulesOf: (id: string) => DocModule[];
  pagesByModule: Record<string, DocPage[]>;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  moduleSlug?: string;
  pageSlug?: string;
  buildPageTree: (pages: DocPage[]) => { roots: DocPage[]; children: (id: string) => DocPage[] };
  depth: number;
}) {
  const isExpanded = expanded[mod.id] ?? false;
  const pages = pagesByModule[mod.id] || [];
  const { roots, children } = buildPageTree(pages);
  const hasContent = roots.length > 0 || subModules.length > 0;
  const isActiveModule = mod.slug === moduleSlug;

  const indentPx = depth * 12;

  return (
    <div className={cn("mb-1", depth > 0 && "ml-2 border-l border-border/50 pl-2")}>
      {/* Cabeçalho do módulo */}
      <button
        onClick={() => toggle(mod.id)}
        className={cn(
          "w-full flex items-center gap-1.5 px-2 py-1.5 mb-0.5 rounded-md transition-colors",
          depth === 0
            ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30"
            : "text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20",
          isActiveModule && "text-primary"
        )}
        style={{ paddingLeft: depth > 0 ? 8 : undefined }}
      >
        {hasContent ? (
          isExpanded
            ? <ChevronDown className="h-3 w-3 flex-shrink-0" />
            : <ChevronRight className="h-3 w-3 flex-shrink-0" />
        ) : (
          <FolderOpen className="h-3 w-3 flex-shrink-0 opacity-50" />
        )}
        <span className="truncate text-left">{mod.title}</span>
      </button>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="space-y-0.5 mb-2">
          {/* Submódulos primeiro */}
          {subModules.map((sub) => (
            <ModuleSection
              key={sub.id}
              mod={sub}
              subModules={subModulesOf(sub.id)}
              subModulesOf={subModulesOf}
              pagesByModule={pagesByModule}
              expanded={expanded}
              toggle={toggle}
              moduleSlug={moduleSlug}
              pageSlug={pageSlug}
              buildPageTree={buildPageTree}
              depth={depth + 1}
            />
          ))}

          {/* Páginas diretas do módulo */}
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
              baseIndent={depth > 0 ? 8 : 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Link de página (recursivo para subpáginas) ────────────────────────────────

function PageLink({
  page,
  moduleSlug,
  activePageSlug,
  childPages,
  allChildren,
  currentModuleSlug,
  depth,
  baseIndent = 0,
}: {
  page: DocPage;
  moduleSlug: string;
  activePageSlug?: string;
  childPages: DocPage[];
  allChildren: (parentId: string) => DocPage[];
  currentModuleSlug?: string;
  depth: number;
  baseIndent?: number;
}) {
  const isActive = moduleSlug === currentModuleSlug && page.slug === activePageSlug;
  const [open, setOpen] = useState(
    isActive || childPages.some((c) => c.slug === activePageSlug)
  );

  return (
    <div>
      <div className="flex items-center">
        {depth > 0 && (
          <div
            className="flex-shrink-0 border-l border-border"
            style={{ width: 16, marginLeft: baseIndent + depth * 12 }}
          />
        )}

        {childPages.length > 0 ? (
          <button
            onClick={() => setOpen(!open)}
            className="p-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          depth === 0 && <div className="w-5 flex-shrink-0" style={{ marginLeft: baseIndent }} />
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
              baseIndent={baseIndent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
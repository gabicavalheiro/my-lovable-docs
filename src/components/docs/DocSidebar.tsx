import { Link, useParams, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, FolderOpen, GraduationCap, GitBranch } from "lucide-react";
import { useState, useMemo } from "react";
import { useModules, useAllPagesSidebar, type DocModule } from "@/hooks/useDocData";
import { cn } from "@/lib/utils";

type SidebarPage = { id: string; module_id: string; parent_page_id: string | null; title: string; slug: string; order_index: number; };

function AcademiaLink() {
  const location = useLocation();
  const isActive = location.pathname === "/academia";
  return (
    <Link to="/academia"
      className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold mb-1 transition-all",
        isActive ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
      style={isActive ? { background: "var(--brand-gradient)" } : {}}>
      <GraduationCap className="h-4 w-4 flex-shrink-0" />
      <span>Academia</span>
    </Link>
  );
}

function DiagnosticosLink() {
  const location = useLocation();
  const isActive = location.pathname === "/diagnosticos";
  return (
    <Link to="/diagnosticos"
      className={cn("flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-semibold mb-1 transition-all",
        isActive ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
      style={isActive ? { background: "var(--brand-gradient)" } : {}}>
      <GitBranch className="h-4 w-4 flex-shrink-0" />
      <span>Diagnósticos</span>
    </Link>
  );
}

export function DocSidebar() {
  const { moduleSlug, pageSlug } = useParams();
  const { data: modules }        = useModules();
  const { data: allPages }       = useAllPagesSidebar(); // payload mínimo
  const [expanded, setExpanded]  = useState<Record<string, boolean>>({});

  const pagesByModule = useMemo(() => {
    if (!allPages) return {} as Record<string, SidebarPage[]>;
    const map: Record<string, SidebarPage[]> = {};
    allPages.forEach((p) => {
      if (!map[p.module_id]) map[p.module_id] = [];
      map[p.module_id].push(p as SidebarPage);
    });
    return map;
  }, [allPages]);

  const rootModules = useMemo(() => modules?.filter((m) => !m.parent_module_id) ?? [], [modules]);
  const subModulesOf = (parentId: string) => modules?.filter((m) => m.parent_module_id === parentId) ?? [];
  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const activeModule = modules?.find((m) => m.slug === moduleSlug);
  if (activeModule) {
    if (expanded[activeModule.id] === undefined) expanded[activeModule.id] = true;
    if (activeModule.parent_module_id && expanded[activeModule.parent_module_id] === undefined)
      expanded[activeModule.parent_module_id] = true;
  }

  const buildPageTree = (pages: SidebarPage[]) => ({
    roots:    pages.filter((p) => !p.parent_page_id),
    children: (parentId: string) => pages.filter((p) => p.parent_page_id === parentId),
  });

  return (
    <aside className="w-[260px] min-h-0 border-r border-border bg-doc-sidebar flex-shrink-0 flex flex-col overflow-y-auto">
      <nav className="flex-1 py-4 px-3">
        <AcademiaLink />
        <DiagnosticosLink />
        <div className="border-t border-border/50 mb-3 mt-2" />
        {rootModules.map((mod) => (
          <ModuleSection key={mod.id} mod={mod}
            subModules={subModulesOf(mod.id)} subModulesOf={subModulesOf}
            pagesByModule={pagesByModule} expanded={expanded} toggle={toggle}
            moduleSlug={moduleSlug} pageSlug={pageSlug} buildPageTree={buildPageTree} depth={0} />
        ))}
      </nav>
    </aside>
  );
}

function ModuleSection({ mod, subModules, subModulesOf, pagesByModule, expanded, toggle, moduleSlug, pageSlug, buildPageTree, depth }: {
  mod: DocModule; subModules: DocModule[]; subModulesOf: (id: string) => DocModule[];
  pagesByModule: Record<string, SidebarPage[]>; expanded: Record<string, boolean>; toggle: (id: string) => void;
  moduleSlug?: string; pageSlug?: string;
  buildPageTree: (p: SidebarPage[]) => { roots: SidebarPage[]; children: (id: string) => SidebarPage[] }; depth: number;
}) {
  const isExpanded = expanded[mod.id] ?? false;
  const pages = pagesByModule[mod.id] || [];
  const { roots, children } = buildPageTree(pages);
  const hasContent = roots.length > 0 || subModules.length > 0;
  const isActiveModule = mod.slug === moduleSlug;

  return (
    <div className={cn("mb-1", depth > 0 && "ml-2 border-l border-border/50 pl-2")}>
      <button onClick={() => toggle(mod.id)}
        className={cn("w-full flex items-center gap-1.5 px-2 py-1.5 mb-0.5 rounded-md transition-colors",
          depth === 0
            ? cn("text-sm font-semibold", isActiveModule ? "text-foreground bg-muted" : "text-foreground/80 hover:text-foreground hover:bg-muted/50")
            : cn("text-xs font-medium", isActiveModule ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"))}>
        <FolderOpen className={cn("flex-shrink-0 text-muted-foreground", depth === 0 ? "h-3.5 w-3.5" : "h-3 w-3")} />
        <span className="flex-1 text-left truncate">{mod.title}</span>
        {hasContent && (isExpanded
          ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />)}
      </button>
      {isExpanded && (
        <div className="mb-1">
          {subModules.map((sub) => (
            <ModuleSection key={sub.id} mod={sub}
              subModules={subModulesOf(sub.id)} subModulesOf={subModulesOf}
              pagesByModule={pagesByModule} expanded={expanded} toggle={toggle}
              moduleSlug={moduleSlug} pageSlug={pageSlug} buildPageTree={buildPageTree} depth={depth + 1} />
          ))}
          {roots.map((page) => (
            <PageTree key={page.id} page={page} children={children} mod={mod} pageSlug={pageSlug} depth={depth} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageTree({ page, children, mod, pageSlug, depth }: {
  page: SidebarPage; children: (id: string) => SidebarPage[];
  mod: DocModule; pageSlug?: string; depth: number;
}) {
  const subPages = children(page.id);
  const isActive = page.slug === pageSlug;
  const indent   = depth === 0 ? "pl-5" : "pl-3";
  return (
    <div>
      <Link to={`/docs/${mod.slug}/${page.slug}`}
        className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors mb-0.5", indent,
          isActive ? "font-semibold text-foreground bg-primary/8" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}
        style={isActive ? { borderLeft: "2px solid var(--brand-primary)", marginLeft: "-1px" } : {}}>
        <span className="truncate">{page.title}</span>
      </Link>
      {subPages.length > 0 && (
        <div className="ml-3 border-l border-border/40 pl-2">
          {subPages.map((child) => (
            <PageTree key={child.id} page={child} children={children} mod={mod} pageSlug={pageSlug} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
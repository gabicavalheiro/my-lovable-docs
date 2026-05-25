import { memo, useMemo, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { headingToId, stripMarkdownInline } from "@/lib/heading-utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/* ─── Configuração do observer ───────────────────────────────────────────────── */
const OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "0px 0px -70% 0px",
  threshold: 0,
};

/* ─── Extração dos headings do Markdown ──────────────────────────────────────── */
function parseHeadings(content: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /^(#{1,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length;
    const raw = match[2].trim();
    const text = stripMarkdownInline(raw);
    const id = headingToId(text);
    if (id) items.push({ id, text, level });
  }

  return items;
}

/* ─── Componente ─────────────────────────────────────────────────────────────── */
export const DocTableOfContents = memo(function DocTableOfContents({
  content,
}: {
  content: string;
}) {
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => parseHeadings(content), [content]);

  // Callback estável — não recria o observer quando activeId muda
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (visible.length > 0) setActiveId(visible[0].target.id);
    },
    [] // sem deps: setActiveId é estável
  );

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(handleIntersect, OBSERVER_OPTIONS);

    // Coleta todos os elementos de uma vez, evitando reflow por elemento
    const elements = headings
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [headings, handleIntersect]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }, []);

  if (headings.length === 0) return null;

  return (
    <aside className="w-[220px] flex-shrink-0 hidden lg:flex flex-col">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] flex flex-col py-6 pr-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-4 flex-shrink-0">
          Nesta página
        </p>

        <nav className="flex-1 overflow-y-auto border-l border-border pl-4 space-y-0.5 pr-1">
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollTo(h.id);
              }}
              title={h.text}
              className={cn(
                "block text-sm transition-colors py-0.5 leading-6 truncate",
                h.level === 1 && "font-medium",
                h.level === 3 && "pl-3",
                h.level === 4 && "pl-6",
                activeId === h.id
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
});
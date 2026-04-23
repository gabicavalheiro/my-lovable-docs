import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * IDÊNTICA à headingToId exportada pelo MarkdownRenderer.
 * As duas funções devem ser mantidas em sincronia.
 */
function headingToId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();
}

/**
 * Remove formatação Markdown inline do texto de um heading
 * para que o texto exibido no TOC fique limpo.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **negrito**
    .replace(/\*(.+?)\*/g, "$1")        // *itálico*
    .replace(/__(.+?)__/g, "$1")        // __negrito__
    .replace(/_(.+?)_/g, "$1")          // _itálico_
    .replace(/`(.+?)`/g, "$1")          // `código`
    .replace(/~~(.+?)~~/g, "$1")        // ~~tachado~~
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [link](url)
    .trim();
}

export function DocTableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>("");

  const headings = useMemo(() => {
    const items: TocItem[] = [];
    const regex = /^(#{1,4})\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const raw = match[2].trim();
      const text = stripMarkdown(raw);   // texto limpo para exibir
      const id = headingToId(text);       // ID gerado do texto já limpo
      if (id) items.push({ id, text, level });
    }
    return items;
  }, [content]);

  // Destaca o heading visível conforme o scroll
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

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
              onClick={(e) => { e.preventDefault(); scrollTo(h.id); }}
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
}
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function DocTableOfContents({ content }: { content: string }) {
  const headings = useMemo(() => {
    const items: TocItem[] = [];
    const regex = /^(#{2,4})\s+(.+)$/gm;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      items.push({ id, text, level });
    }
    return items;
  }, [content]);

  if (headings.length === 0) return null;

  return (
    <aside className="w-[220px] flex-shrink-0 hidden xl:block">
      <div className="sticky top-20 py-6 pr-4">
        <nav className="space-y-1 border-l border-border pl-4">
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${h.id}`}
              className={cn(
                "block text-sm text-muted-foreground hover:text-primary transition-colors leading-7",
                h.level === 3 && "pl-3",
                h.level === 4 && "pl-6"
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
import { useMemo } from "react";
import { useAllPages, useModules } from "@/hooks/useDocData";

export type ExcerptHit = {
  text: string;
  anchor: string | null; // id do heading mais próximo acima
};

export type SearchResult = {
  page: {
    id: string;
    title: string;
    slug: string;
    content: string;
    module_id: string;
    parent_page_id: string | null;
  };
  modTitle: string;
  modSlug: string;
  parentTitle: string | null;
  titleMatch: boolean;
  hits: ExcerptHit[]; // todos os trechos onde a palavra aparece
  score: number;
};

/** Slug de heading igual ao gerado pelo MarkdownRenderer */
function headingToId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Encontra o heading mais próximo ACIMA do índice dado no conteúdo markdown.
 */
function nearestHeadingId(content: string, idx: number): string | null {
  const regex = /^#{1,4}\s+(.+)$/gm;
  let lastId: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > idx) break;
    lastId = headingToId(m[1].trim());
  }
  return lastId;
}

/**
 * Extrai até `maxHits` trechos do conteúdo onde `q` aparece.
 */
function extractHits(content: string, q: string, maxHits = 5): ExcerptHit[] {
  const lower = content.toLowerCase();
  const hits: ExcerptHit[] = [];
  let searchFrom = 0;

  while (hits.length < maxHits) {
    const idx = lower.indexOf(q, searchFrom);
    if (idx === -1) break;

    const start = Math.max(0, idx - 60);
    const end = Math.min(content.length, idx + 140);
    const raw = content.slice(start, end).replace(/[#*`>\-_]/g, "").trim();
    const text = (start > 0 ? "..." : "") + raw + (end < content.length ? "..." : "");
    const anchor = nearestHeadingId(content, idx);

    hits.push({ text, anchor });
    searchFrom = idx + q.length;
  }

  return hits;
}

export function useDocSearch(query: string): SearchResult[] {
  const { data: allPages } = useAllPages();
  const { data: modules } = useModules();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!allPages || !modules || q.length < 2) return [];

    return allPages
      .map((page) => {
        const mod = modules.find((m) => m.id === page.module_id);
        const parent = page.parent_page_id
          ? allPages.find((p) => p.id === page.parent_page_id)
          : null;

        const titleMatch = page.title.toLowerCase().includes(q);
        const hits = extractHits(page.content, q);
        const inMod = (mod?.title ?? "").toLowerCase().includes(q);

        if (!titleMatch && hits.length === 0 && !inMod) return null;

        const score = (titleMatch ? 4 : 0) + (inMod ? 2 : 0) + hits.length;

        return {
          page,
          modTitle: mod?.title ?? "—",
          modSlug: mod?.slug ?? "",
          parentTitle: parent?.title ?? null,
          titleMatch,
          hits,
          score,
        } as SearchResult;
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score) as SearchResult[];
  }, [allPages, modules, query]);
}

/** Divide texto em partes para destacar a query */
export function highlightMatch(text: string, query: string) {
  if (!query || query.trim().length < 2) return [{ text, hl: false }];
  const q = query.trim();
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.split(regex).map((part) => ({
    text: part,
    hl: part.toLowerCase() === q.toLowerCase(),
  }));
}
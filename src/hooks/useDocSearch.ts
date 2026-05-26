import { useMemo } from "react";
import { useAllPages, useModules } from "@/hooks/useDocData";
import { headingToId, stripMarkdownInline, nearestHeadingId } from "@/lib/heading-utils";

export type ExcerptHit = { text: string; anchor: string | null; };

export type SearchResult = {
  page: { id: string; title: string; slug: string; content: string; module_id: string; parent_page_id: string | null; };
  modTitle: string; modSlug: string; parentTitle: string | null;
  titleMatch: boolean; hits: ExcerptHit[]; score: number;
};

const EXCERPT_BEFORE = 60;
const EXCERPT_AFTER  = 140;
const MAX_HITS       = 5;

function extractHits(content: string, q: string): ExcerptHit[] {
  const lower = content.toLowerCase();
  const hits: ExcerptHit[] = [];
  let from = 0;
  while (hits.length < MAX_HITS) {
    const idx = lower.indexOf(q, from);
    if (idx === -1) break;
    const start = Math.max(0, idx - EXCERPT_BEFORE);
    const end   = Math.min(content.length, idx + EXCERPT_AFTER);
    const raw   = content.slice(start, end).replace(/[#*`>\-_~]/g, "").replace(/\[(.+?)\]\(.+?\)/g, "$1").trim();
    hits.push({ text: (start > 0 ? "…" : "") + raw + (end < content.length ? "…" : ""), anchor: nearestHeadingId(content, idx) });
    from = idx + q.length;
  }
  return hits;
}

export function useDocSearch(query: string): SearchResult[] {
  const { data: allPages } = useAllPages(); // sem JSONB de IA
  const { data: modules }  = useModules();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!allPages || !modules || q.length < 2) return [];

    const moduleMap = new Map(modules.map((m) => [m.id, m]));
    const pageMap   = new Map(allPages.map((p) => [p.id, p]));
    const results: SearchResult[] = [];

    for (const page of allPages) {
      const mod    = moduleMap.get(page.module_id);
      const parent = page.parent_page_id ? pageMap.get(page.parent_page_id) : undefined;
      const titleMatch = page.title.toLowerCase().includes(q);
      const inMod      = (mod?.title ?? "").toLowerCase().includes(q);
      const hits       = extractHits(page.content, q);
      if (!titleMatch && hits.length === 0 && !inMod) continue;
      results.push({
        page,
        modTitle:    mod?.title ?? "—",
        modSlug:     mod?.slug ?? "",
        parentTitle: parent?.title ?? null,
        titleMatch, hits,
        score: (titleMatch ? 4 : 0) + (inMod ? 2 : 0) + hits.length,
      });
    }
    return results.sort((a, b) => b.score - a.score);
  }, [allPages, modules, query]);
}

export function highlightMatch(text: string, query: string): Array<{ text: string; hl: boolean }> {
  if (!query || query.trim().length < 2) return [{ text, hl: false }];
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex   = new RegExp(`(${escaped})`, "gi");
  return text.split(regex).map((part) => ({ text: part, hl: part.toLowerCase() === query.trim().toLowerCase() }));
}

export { headingToId, stripMarkdownInline };
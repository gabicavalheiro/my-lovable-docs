import { useMemo } from "react";
import { useAllPages, useModules } from "@/hooks/useDocData";
import { headingToId, stripMarkdownInline, nearestHeadingId } from "@/lib/heading-utils";

export type ExcerptHit = {
  text: string;
  anchor: string | null;
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
  hits: ExcerptHit[];
  score: number;
};

/* ─── Extração de trechos relevantes ─────────────────────────────────────── */
const EXCERPT_CONTEXT_BEFORE = 60;
const EXCERPT_CONTEXT_AFTER = 140;
const MAX_HITS_PER_PAGE = 5;

function extractHits(content: string, q: string): ExcerptHit[] {
  const lower = content.toLowerCase();
  const hits: ExcerptHit[] = [];
  let searchFrom = 0;

  while (hits.length < MAX_HITS_PER_PAGE) {
    const idx = lower.indexOf(q, searchFrom);
    if (idx === -1) break;

    const start = Math.max(0, idx - EXCERPT_CONTEXT_BEFORE);
    const end = Math.min(content.length, idx + EXCERPT_CONTEXT_AFTER);

    // Remove formatação Markdown para o trecho do resultado
    const raw = content
      .slice(start, end)
      .replace(/[#*`>\-_~]/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .trim();

    const text =
      (start > 0 ? "…" : "") + raw + (end < content.length ? "…" : "");

    hits.push({ text, anchor: nearestHeadingId(content, idx) });
    searchFrom = idx + q.length;
  }

  return hits;
}

/* ─── Hook principal ─────────────────────────────────────────────────────── */
/**
 * Busca full-text client-side com scoring.
 *
 * Pontuação:
 *   +4 match no título
 *   +2 match no nome do módulo
 *   +1 por cada trecho encontrado no conteúdo (até 5)
 *
 * NOTA DE PERFORMANCE: o caller deve fazer debounce antes de passar `query`
 * (ex: useDebounce(query, 200)) para evitar recomputação a cada keystroke.
 */
export function useDocSearch(query: string): SearchResult[] {
  const { data: allPages } = useAllPages();
  const { data: modules } = useModules();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!allPages || !modules || q.length < 2) return [];

    const moduleMap = new Map(modules.map((m) => [m.id, m]));
    const pageMap = new Map(allPages.map((p) => [p.id, p]));

    const results: SearchResult[] = [];

    for (const page of allPages) {
      const mod = moduleMap.get(page.module_id);
      const parent = page.parent_page_id
        ? pageMap.get(page.parent_page_id)
        : undefined;

      const titleMatch = page.title.toLowerCase().includes(q);
      const inMod = (mod?.title ?? "").toLowerCase().includes(q);
      const hits = extractHits(page.content, q);

      if (!titleMatch && hits.length === 0 && !inMod) continue;

      const score = (titleMatch ? 4 : 0) + (inMod ? 2 : 0) + hits.length;

      results.push({
        page,
        modTitle: mod?.title ?? "—",
        modSlug: mod?.slug ?? "",
        parentTitle: parent?.title ?? null,
        titleMatch,
        hits,
        score,
      });
    }

    return results.sort((a, b) => b.score - a.score);
  }, [allPages, modules, query]);
}

/* ─── Utilitário de highlight ────────────────────────────────────────────── */
/**
 * Divide um texto em partes com flag de highlight para o termo buscado.
 * Use para renderizar resultados com a query destacada.
 */
export function highlightMatch(
  text: string,
  query: string
): Array<{ text: string; hl: boolean }> {
  if (!query || query.trim().length < 2) return [{ text, hl: false }];

  const q = query.trim();
  // Escapa caracteres especiais de regex
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  return text.split(regex).map((part) => ({
    text: part,
    hl: part.toLowerCase() === q.toLowerCase(),
  }));
}

// Re-exporta para uso nos componentes de busca
export { headingToId, stripMarkdownInline };
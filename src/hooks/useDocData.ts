import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type DocModule = Tables<"doc_modules">;
export type DocPage   = Tables<"doc_pages">;

const QUERY_DEFAULTS = {
  staleTime:            5 * 60 * 1000,
  gcTime:              10 * 60 * 1000,
  retry:                1,
  refetchOnWindowFocus: false,
} as const;

/* ─── Módulos ─────────────────────────────────────────────────────────────── */
export function useModules() {
  return useQuery({
    queryKey: ["doc_modules"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doc_modules").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
    ...QUERY_DEFAULTS,
  });
}

/* ─── Sidebar: só campos de navegação (sem content nem JSONB de IA) ─────── */
export function useAllPagesSidebar() {
  return useQuery({
    queryKey: ["doc_pages_sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("id, module_id, parent_page_id, title, slug, order_index")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    staleTime:            10 * 60 * 1000,
    gcTime:               20 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
}

/* ─── Busca: com content, sem JSONB de IA ────────────────────────────────── */
export function useAllPagesSearch() {
  return useQuery({
    queryKey: ["doc_pages_search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("id, module_id, parent_page_id, title, slug, content, tags, order_index")
        .order("order_index");
      if (error) throw error;
      return data;
    },
    ...QUERY_DEFAULTS,
  });
}

/* ─── Academia Index: só páginas com academia_content ───────────────────── */
type AcademiaPage = { id: string; module_id: string; slug: string; title: string; academia_content: any; order_index: number; };
export function useAcademiaPages() {
  return useQuery<AcademiaPage[]>({
    queryKey: ["academia_pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("id, module_id, slug, title, academia_content, order_index" as any)
        .not("academia_content" as any, "is", null)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as AcademiaPage[];
    },
    staleTime:            0,
    gcTime:               5 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
}

/* ─── Diagnósticos Index: só páginas com diagnostic_content ─────────────── */
type DiagnosticPage = { id: string; module_id: string; slug: string; title: string; diagnostic_content: any; order_index: number; };
export function useDiagnosticPages() {
  return useQuery<DiagnosticPage[]>({
    queryKey: ["diagnostic_pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("id, module_id, slug, title, diagnostic_content, order_index" as any)
        .not("diagnostic_content" as any, "is", null)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as DiagnosticPage[];
    },
    staleTime:            0,
    gcTime:               5 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
}

/* ─── Admin: todas as páginas com JSONB (estado dos botões de geração) ───── */
export function useAllPages() {
  return useQuery({
    queryKey: ["doc_pages_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doc_pages").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
    ...QUERY_DEFAULTS,
  });
}

/* ─── Páginas de um módulo ────────────────────────────────────────────────── */
export function usePages(moduleId?: string) {
  return useQuery({
    queryKey: ["doc_pages", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages").select("*").eq("module_id", moduleId!).order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
    ...QUERY_DEFAULTS,
  });
}

/* ─── Página por slug (cache-first) ──────────────────────────────────────── */
export function usePageBySlug(moduleSlug?: string, pageSlug?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["doc_page", moduleSlug, pageSlug],
    queryFn: async () => {
      const cachedModules = queryClient.getQueryData<DocModule[]>(["doc_modules"]);
      let moduleId = cachedModules?.find((m) => m.slug === moduleSlug)?.id;
      if (!moduleId) {
        const { data: mod } = await supabase.from("doc_modules").select("id").eq("slug", moduleSlug!).single();
        moduleId = mod?.id;
      }
      if (!moduleId) return null;
      const { data: page, error } = await supabase
        .from("doc_pages").select("*").eq("module_id", moduleId).eq("slug", pageSlug!).single();
      if (error) return null;
      return page;
    },
    enabled: !!moduleSlug && !!pageSlug,
    ...QUERY_DEFAULTS,
  });
}

/* ─── Mutações ───────────────────────────────────────────────────────────── */
function invalidateAllPageCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["doc_pages"] });
  qc.invalidateQueries({ queryKey: ["doc_pages_all"] });
  qc.invalidateQueries({ queryKey: ["doc_pages_sidebar"] });
  qc.invalidateQueries({ queryKey: ["doc_pages_search"] });
  qc.invalidateQueries({ queryKey: ["doc_page"] });
}

export function useUpsertModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mod: TablesInsert<"doc_modules"> & { id?: string }) => {
      if (mod.id) {
        const { data, error } = await supabase.from("doc_modules").update(mod).eq("id", mod.id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await supabase.from("doc_modules").insert(mod).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doc_modules"] }),
  });
}

export function useDeleteModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doc_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doc_modules"] }),
  });
}

export function useUpsertPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: TablesInsert<"doc_pages"> & { id?: string }) => {
      if (page.id) {
        const { data, error } = await supabase.from("doc_pages").update(page).eq("id", page.id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await supabase.from("doc_pages").insert(page).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => invalidateAllPageCaches(qc),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doc_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllPageCaches(qc);
      qc.invalidateQueries({ queryKey: ["academia_pages"] });
      qc.invalidateQueries({ queryKey: ["diagnostic_pages"] });
    },
  });
}
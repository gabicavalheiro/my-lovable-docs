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
      const { data, error } = await supabase
        .from("doc_modules").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
    ...QUERY_DEFAULTS,
  });
}

/* ─── Todas as páginas (sidebar, busca, admin) ───────────────────────────── */
export function useAllPages() {
  return useQuery({
    queryKey: ["doc_pages_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages").select("*").order("order_index");
      if (error) throw error;
      return data;
    },
    ...QUERY_DEFAULTS,
  });
}

// Alias para sidebar e busca — mesma query, mesmo cache
export const useAllPagesSidebar = useAllPages;
export const useAllPagesSearch  = useAllPages;

/* ─── Academia: filtra client-side do cache existente ───────────────────── */
export function useAcademiaPages() {
  return useQuery({
    queryKey: ["academia_pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages").select("*").order("order_index");
      if (error) throw error;
      return (data ?? []).filter(
        (p) => (p as any).academia_content?.steps?.length > 0
      );
    },
    staleTime:            2 * 60 * 1000,
    gcTime:               10 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
  });
}

/* ─── Diagnósticos: filtra client-side ──────────────────────────────────── */
export function useDiagnosticPages() {
  return useQuery({
    queryKey: ["diagnostic_pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages").select("*").order("order_index");
      if (error) throw error;
      return (data ?? []).filter(
        (p) => (p as any).diagnostic_content?.steps?.length > 0
      );
    },
    staleTime:            2 * 60 * 1000,
    gcTime:               10 * 60 * 1000,
    retry:                1,
    refetchOnWindowFocus: false,
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
        const { data: mod } = await supabase
          .from("doc_modules").select("id").eq("slug", moduleSlug!).single();
        moduleId = mod?.id;
      }
      if (!moduleId) return null;
      const { data: page, error } = await supabase
        .from("doc_pages").select("*")
        .eq("module_id", moduleId).eq("slug", pageSlug!).single();
      if (error) return null;
      return page;
    },
    enabled: !!moduleSlug && !!pageSlug,
    ...QUERY_DEFAULTS,
  });
}

/* ─── Mutações ───────────────────────────────────────────────────────────── */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["doc_pages_all"] });
  qc.invalidateQueries({ queryKey: ["doc_pages"] });
  qc.invalidateQueries({ queryKey: ["doc_page"] });
  qc.invalidateQueries({ queryKey: ["academia_pages"] });
  qc.invalidateQueries({ queryKey: ["diagnostic_pages"] });
}

export function useUpsertModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mod: TablesInsert<"doc_modules"> & { id?: string }) => {
      if (mod.id) {
        const { data, error } = await supabase
          .from("doc_modules").update(mod).eq("id", mod.id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await supabase
        .from("doc_modules").insert(mod).select().single();
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
        const { data, error } = await supabase
          .from("doc_pages").update(page).eq("id", page.id).select().single();
        if (error) throw error; return data;
      }
      const { data, error } = await supabase
        .from("doc_pages").insert(page).select().single();
      if (error) throw error; return data;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doc_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
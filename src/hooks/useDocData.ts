import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type DocModule = Tables<"doc_modules">;
export type DocPage = Tables<"doc_pages">;

export function useModules() {
  return useQuery({
    queryKey: ["doc_modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_modules")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
}

export function usePages(moduleId?: string) {
  return useQuery({
    queryKey: ["doc_pages", moduleId],
    queryFn: async () => {
      let query = supabase.from("doc_pages").select("*").order("order_index");
      if (moduleId) query = query.eq("module_id", moduleId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
}

export function useAllPages() {
  return useQuery({
    queryKey: ["doc_pages_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });
}

export function usePageBySlug(moduleSlug?: string, pageSlug?: string) {
  return useQuery({
    queryKey: ["doc_page", moduleSlug, pageSlug],
    queryFn: async () => {
      const { data: mod } = await supabase
        .from("doc_modules")
        .select("id")
        .eq("slug", moduleSlug!)
        .single();
      if (!mod) return null;
      const { data: page, error } = await supabase
        .from("doc_pages")
        .select("*")
        .eq("module_id", mod.id)
        .eq("slug", pageSlug!)
        .single();
      if (error) return null;
      return page;
    },
    enabled: !!moduleSlug && !!pageSlug,
  });
}

export function useUpsertModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mod: TablesInsert<"doc_modules"> & { id?: string }) => {
      if (mod.id) {
        const { data, error } = await supabase
          .from("doc_modules")
          .update(mod)
          .eq("id", mod.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("doc_modules")
        .insert(mod)
        .select()
        .single();
      if (error) throw error;
      return data;
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
          .from("doc_pages")
          .update(page)
          .eq("id", page.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("doc_pages")
        .insert(page)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc_pages"] });
      qc.invalidateQueries({ queryKey: ["doc_pages_all"] });
      qc.invalidateQueries({ queryKey: ["doc_page"] });
    },
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
      qc.invalidateQueries({ queryKey: ["doc_pages"] });
      qc.invalidateQueries({ queryKey: ["doc_pages_all"] });
    },
  });
}

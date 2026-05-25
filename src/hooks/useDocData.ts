import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type DocModule = Tables<"doc_modules">;
export type DocPage = Tables<"doc_pages">;

/* ─── Configurações de cache ─────────────────────────────────────────────────
 * staleTime: dados considerados frescos por 5 min → zero refetch desnecessário
 * gcTime:    cache mantido em memória por 10 min após desmontar o componente
 * retry: 1   uma retentativa é suficiente; não martela o banco em cascata
 */
const QUERY_DEFAULTS = {
  staleTime: 5 * 60 * 1000,   // 5 minutos
  gcTime: 10 * 60 * 1000,     // 10 minutos
  retry: 1,
  refetchOnWindowFocus: false, // leitura de docs não precisa revalidar ao focar
} as const;

/* ─── Módulos ─────────────────────────────────────────────────────────────── */
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
    ...QUERY_DEFAULTS,
  });
}

/* ─── Páginas de um módulo ────────────────────────────────────────────────── */
export function usePages(moduleId?: string) {
  return useQuery({
    queryKey: ["doc_pages", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_pages")
        .select("*")
        .eq("module_id", moduleId!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
    ...QUERY_DEFAULTS,
  });
}

/* ─── Todas as páginas (busca global + edição) ───────────────────────────────
 * select("*") mantém o tipo inferido como DocPage completo.
 * Evita erros de tipo em openEditPage e qualquer função que espere
 * o shape completo do Supabase (created_at, updated_at).
 */
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
    ...QUERY_DEFAULTS,
  });
}

/* ─── Página por slug ────────────────────────────────────────────────────────
 * OTIMIZAÇÃO CRÍTICA: elimina o round-trip duplo ao banco.
 *
 * Estratégia cache-first:
 *   1. Tenta encontrar o module_id no cache React Query (já carregado pela sidebar)
 *   2. Se não houver cache, faz apenas um SELECT leve (só a coluna `id`)
 *   3. Com o module_id em mãos, busca a página em um único SELECT
 *
 * No fluxo normal (usuário navega pela sidebar), o passo 2 nunca executa,
 * pois useModules() já populou o cache ao renderizar o DocsLayout.
 */
export function usePageBySlug(moduleSlug?: string, pageSlug?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["doc_page", moduleSlug, pageSlug],
    queryFn: async () => {
      // 1. Tenta obter module_id do cache (custo zero)
      const cachedModules = queryClient.getQueryData<DocModule[]>(["doc_modules"]);
      let moduleId: string | undefined = cachedModules?.find(
        (m) => m.slug === moduleSlug
      )?.id;

      // 2. Cache miss: faz um SELECT mínimo (só `id`)
      if (!moduleId) {
        const { data: mod } = await supabase
          .from("doc_modules")
          .select("id")
          .eq("slug", moduleSlug!)
          .single();
        moduleId = mod?.id;
      }

      if (!moduleId) return null;

      // 3. Busca a página com o module_id resolvido
      const { data: page, error } = await supabase
        .from("doc_pages")
        .select("*")
        .eq("module_id", moduleId)
        .eq("slug", pageSlug!)
        .single();

      if (error) return null;
      return page;
    },
    enabled: !!moduleSlug && !!pageSlug,
    ...QUERY_DEFAULTS,
  });
}

/* ─── Mutações ───────────────────────────────────────────────────────────── */

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
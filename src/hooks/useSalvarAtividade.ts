import { supabase } from "@/integrations/supabase/client";

interface AtividadePayload {
  tipo:        "academia" | "diagnostico";
  page_id:     string;
  page_title:  string;
  score_pct:   number;
  acertos:     number;
  total:       number;
  duracao_seg: number;
}

export async function salvarAtividade(payload: AtividadePayload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return; // não logado, ignora silenciosamente

  // Descobre quantas tentativas já tem nessa page
  const { count } = await supabase
    .from("atividades" as any)
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", user.id)
    .eq("page_id", payload.page_id)
    .eq("tipo", payload.tipo);

  await supabase.from("atividades" as any).insert({
    cliente_id:  user.id,
    tentativa:   (count ?? 0) + 1,
    ...payload,
  });
}
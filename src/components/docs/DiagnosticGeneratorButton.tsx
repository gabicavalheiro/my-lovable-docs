/**
 * DiagnosticGeneratorButton — autocontido.
 * Gera um fluxo diagnóstico interativo via Gemini e salva no Supabase.
 */
import { useState, useEffect, useRef } from "react";
import { GitBranch, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { DiagnosticData } from "@/components/docs/DiagnosticFlow";

/* ── Prompt ──────────────────────────────────────────────────────────────────── */
const buildPrompt = (title: string, content: string) => `Você é um especialista em suporte técnico para sistemas ERP.
Analise o conteúdo abaixo e crie um fluxo diagnóstico interativo que ajude o usuário a identificar onde está sua dúvida e receber orientações práticas.

ESTRUTURA:
- 1 pergunta raiz: "Sobre qual parte do processo você tem dúvida?"
- 3 a 5 opções, baseadas nas principais etapas/seções do conteúdo
- Cada opção leva a: um guia prático OU uma sub-pergunta de refinamento
- Guias: 3 a 5 passos numerados, práticos e objetivos
- Profundidade máxima: 2 níveis de perguntas
- Use badge "warning" para erros comuns e "tip" para atalhos úteis

IMPORTANTE: 
- Retorne SOMENTE o objeto JSON, começando com { e terminando com }.
- Seja CONCISO: cada passo do guia deve ter no máximo 15 palavras.
- Complete SEMPRE o JSON — nunca deixe objetos ou arrays abertos.

Formato JSON:
{
  "title": "Diagnóstico: ${title}",
  "subtitle": "Identifique sua dúvida e siga o caminho indicado",
  "steps": [
    {
      "id": "start",
      "type": "question",
      "title": "Sobre qual parte do processo você tem dúvida?",
      "options": [
        { "id": "a", "label": "Opção A", "nextStepId": "guide_a" },
        { "id": "b", "label": "Opção B", "nextStepId": "q_b" },
        { "id": "c", "label": "Opção C", "nextStepId": "guide_c" }
      ]
    },
    {
      "id": "guide_a",
      "type": "guide",
      "title": "Título do guia A",
      "content": "Passo 1: descrição detalhada\\nPasso 2: descrição detalhada\\nPasso 3: descrição detalhada",
      "badge": { "type": "tip", "text": "Dica relevante para este passo." }
    },
    {
      "id": "q_b",
      "type": "question",
      "title": "Pergunta de refinamento sobre B?",
      "options": [
        { "id": "b1", "label": "Situação 1", "nextStepId": "guide_b1" },
        { "id": "b2", "label": "Situação 2", "nextStepId": "guide_b2" }
      ]
    },
    {
      "id": "guide_b1",
      "type": "guide",
      "title": "Resolvendo situação B1",
      "content": "Passo 1: ...\\nPasso 2: ...\\nPasso 3: ...",
      "badge": { "type": "warning", "text": "Atenção a este ponto crítico." }
    },
    {
      "id": "guide_b2",
      "type": "guide",
      "title": "Resolvendo situação B2",
      "content": "Passo 1: ...\\nPasso 2: ...\\nPasso 3: ..."
    },
    {
      "id": "guide_c",
      "type": "guide",
      "title": "Título do guia C",
      "content": "Passo 1: ...\\nPasso 2: ...\\nPasso 3: ..."
    }
  ]
}

---
Título da página: "${title}"
Conteúdo do manual:
${content.slice(0, 10000)}`;

/* ── Modelos Gemini ──────────────────────────────────────────────────────────── */
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

/* ── API call ────────────────────────────────────────────────────────────────── */
async function callGemini(apiKey: string, prompt: string, onWait: (s: number) => void): Promise<DiagnosticData> {
  let lastError = "Nenhum modelo disponível.";

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    for (let attempt = 0; attempt < 4; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 },
          }),
        });
      } catch { throw new Error("Erro de rede. Verifique sua conexão."); }

      if (res.ok) {
        const data = await res.json();
        const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        console.log("[Diagnóstico] Raw preview:", raw.slice(0, 300));

        // Extração robusta: entre o primeiro { e o último }
        const s = raw.indexOf("{");
        const e = raw.lastIndexOf("}");
        if (s === -1 || e < s) {
          console.error("[Diagnóstico] Sem JSON:", raw.slice(0, 500));
          throw new Error("IA não retornou JSON. Tente novamente.");
        }
        const clean = raw.slice(s, e + 1);

        let parsed: DiagnosticData;
        try {
          parsed = JSON.parse(clean);
        } catch (parseErr) {
          console.error("[Diagnóstico] JSON inválido:", clean.slice(0, 400));
          throw new Error("JSON malformado. Tente novamente.");
        }
        if (!parsed?.steps?.length) {
          console.error("[Diagnóstico] Steps vazio:", JSON.stringify(parsed).slice(0, 300));
          throw new Error("Resposta incompleta. Tente novamente.");
        }
        console.log("[Diagnóstico] Sucesso com modelo:", model, "→", parsed.steps.length, "steps");
        return parsed;
      }

      const err = await res.json().catch(() => ({}));
      const msg: string = (err as any)?.error?.message ?? `Erro ${res.status}`;
      lastError = msg;

      if (res.status === 404 || res.status === 400) { console.warn("[Diagnóstico] Modelo indisponível:", model); break; }

      if (res.status === 429 || res.status === 503) {
        const m = msg.match(/retry in ([\d.]+)s/i);
        const wait = m ? Math.ceil(parseFloat(m[1])) + 1 : 30;
        onWait(wait);
        await new Promise<void>(r => setTimeout(r, wait * 1000));
        onWait(0);
        continue;
      }

      throw new Error(msg);
    }
  }
  throw new Error(lastError);
}

/* ── Componente ──────────────────────────────────────────────────────────────── */
interface Props { pageId: string; pageTitle: string; pageContent: string; }

export function DiagnosticGeneratorButton({ pageId, pageTitle, pageContent }: Props) {
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast }                 = useToast();

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCountdown = (s: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (s <= 0) { setCountdown(0); return; }
    setCountdown(s);
    timerRef.current = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; } return p - 1; });
    }, 1000);
  };

  const handle = async () => {
    if (!pageId) { toast({ title: "Salve a página primeiro", variant: "destructive" }); return; }
    if (!pageContent.trim()) { toast({ title: "Página sem conteúdo", variant: "destructive" }); return; }
    const apiKey = localStorage.getItem("gemini_key") ?? localStorage.getItem("anthropic_key") ?? "";
    if (!apiKey) { toast({ title: "Chave Gemini não encontrada", description: "Adicione em Importar (AIza...)", variant: "destructive" }); return; }

    setLoading(true); setDone(false);
    try {
      console.log("[Diagnóstico] Gerando para:", pageTitle);
      const diagnostic = await callGemini(apiKey, buildPrompt(pageTitle, pageContent), startCountdown);

      const { error } = await supabase.from("doc_pages").update({ diagnostic_content: diagnostic } as any).eq("id", pageId);
      if (error) throw new Error(error.message);

      setDone(true);
      toast({ title: "🔍 Diagnóstico gerado!", description: `${diagnostic.steps.length} passos criados para "${pageTitle}".` });
      setTimeout(() => setDone(false), 5000);
    } catch (err: unknown) {
      toast({ title: "Erro ao gerar Diagnóstico", description: err instanceof Error ? err.message : "Erro desconhecido", variant: "destructive" });
    } finally {
      setLoading(false); setCountdown(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handle} disabled={loading || !pageId}
      className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 min-w-[160px] justify-center">
      {loading && countdown > 0 ? (
        <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Aguardando… {countdown}s</span></>
      ) : loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando diagnóstico…</>
      ) : done ? (
        <><CheckCircle2 className="h-4 w-4 text-green-600" /> Diagnóstico gerado!</>
      ) : (
        <><GitBranch className="h-4 w-4" /> Gerar Diagnóstico IA</>
      )}
    </Button>
  );
}
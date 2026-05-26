/**
 * DiagnosticGeneratorButton — autocontido.
 * - Save simples: update + check error (sem .select() que causa falha de tipo)
 * - setQueryData atualiza o cache imediatamente após salvar
 */
import { useState, useEffect, useRef } from "react";
import { GitBranch, Loader2, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { DiagnosticData } from "@/components/docs/DiagnosticFlow";

const buildPrompt = (title: string, content: string) => `Você é um especialista em suporte técnico para sistemas ERP.
Analise o conteúdo abaixo e crie um fluxo diagnóstico interativo.

ESTRUTURA:
- 1 pergunta raiz: "Sobre qual parte do processo você tem dúvida?"
- 3 a 5 opções baseadas nas principais etapas do conteúdo
- Cada opção leva a um guia prático com 3-5 passos numerados
- Use badge "warning" para erros comuns e "tip" para atalhos

IMPORTANTE: Retorne SOMENTE o JSON, sem texto adicional.

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
        { "id": "b", "label": "Opção B", "nextStepId": "guide_b" }
      ]
    },
    {
      "id": "guide_a",
      "type": "guide",
      "title": "Título do guia",
      "content": "Passo 1: descrição\\nPasso 2: descrição\\nPasso 3: descrição"
    }
  ]
}

Título: "${title}"
Conteúdo: ${content.slice(0, 10000)}`;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

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
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8192 } }),
        });
      } catch { throw new Error("Erro de rede. Verifique sua conexão."); }

      if (res.ok) {
        const data = await res.json();
        const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
        if (s === -1 || e < s) throw new Error("IA não retornou JSON. Tente novamente.");
        let parsed: DiagnosticData;
        try { parsed = JSON.parse(raw.slice(s, e + 1)); }
        catch { throw new Error("JSON malformado. Tente novamente."); }
        if (!parsed?.steps?.length) throw new Error("Resposta incompleta. Tente novamente.");
        return parsed;
      }

      const err  = await res.json().catch(() => ({}));
      const msg: string = (err as any)?.error?.message ?? `Erro ${res.status}`;
      lastError = msg;
      if (res.status === 404 || res.status === 400) break;
      if (res.status === 429 || res.status === 503) {
        const m    = msg.match(/retry in ([\d.]+)s/i);
        const wait = m ? Math.ceil(parseFloat(m[1])) + 1 : 30;
        onWait(wait); await new Promise<void>((r) => setTimeout(r, wait * 1000)); onWait(0);
        continue;
      }
      throw new Error(msg);
    }
  }
  throw new Error(lastError);
}

interface Props { pageId: string; pageTitle: string; pageContent: string; hasContent?: boolean; }

export function DiagnosticGeneratorButton({ pageId, pageTitle, pageContent, hasContent = false }: Props) {
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(hasContent);
  const [justDone, setJustDone]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast }                 = useToast();
  const queryClient               = useQueryClient();

  useEffect(() => { setSaved(hasContent); }, [hasContent]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCountdown = (s: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (s <= 0) { setCountdown(0); return; }
    setCountdown(s);
    timerRef.current = setInterval(() => {
      setCountdown((p) => { if (p <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; } return p - 1; });
    }, 1000);
  };

  const handle = async () => {
    if (!pageId)             { toast({ title: "Salve a página primeiro", variant: "destructive" }); return; }
    if (!pageContent.trim()) { toast({ title: "Página sem conteúdo", variant: "destructive" }); return; }
    const apiKey = localStorage.getItem("gemini_key") ?? localStorage.getItem("anthropic_key") ?? "";
    if (!apiKey)             { toast({ title: "Chave Gemini não configurada", description: "Configure em Configurações.", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const diagnostic = await callGemini(apiKey, buildPrompt(pageTitle, pageContent), startCountdown);

      // Save simples — apenas verifica error, sem .select() que falha nos tipos
      const { error } = await supabase
        .from("doc_pages")
        .update({ diagnostic_content: diagnostic } as any)
        .eq("id", pageId);

      if (error) throw new Error(`Erro ao salvar: ${error.message}`);

      // Atualiza o cache diretamente
      queryClient.setQueryData<any[]>(["doc_pages_all"], (old) =>
        old?.map((p) => p.id === pageId ? { ...p, diagnostic_content: diagnostic } : p) ?? old
      );
      queryClient.invalidateQueries({ queryKey: ["diagnostic_pages"] });

      setSaved(true); setJustDone(true);
      setTimeout(() => setJustDone(false), 3000);
      toast({ title: "🔍 Diagnóstico gerado!", description: `${diagnostic.steps.length} passos criados para "${pageTitle}".` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao gerar Diagnóstico", description: msg, variant: "destructive" });
    } finally {
      setLoading(false); setCountdown(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const isSavedIdle = saved && !loading && !justDone;

  return (
    <div className="relative inline-flex">
      <Button type="button" variant="outline" size="sm" onClick={handle} disabled={loading || !pageId}
        className={`gap-2 min-w-[175px] justify-center transition-all ${
          justDone      ? "border-green-400 text-green-700 bg-green-50"
          : isSavedIdle ? "border-violet-400 text-violet-700 bg-violet-50/60 hover:bg-violet-50"
          :               "border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400"
        }`}>
        {loading && countdown > 0 ? (
          <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Aguardando… {countdown}s</span></>
        ) : loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Diagnóstico…</>
        ) : justDone ? (
          <><CheckCircle2 className="h-4 w-4 text-green-600" /> Diagnóstico salvo!</>
        ) : isSavedIdle ? (
          <><RefreshCw className="h-3.5 w-3.5" /> Regen. Diagnóstico IA</>
        ) : (
          <><GitBranch className="h-4 w-4" /> Gerar Diagnóstico IA</>
        )}
      </Button>
      {saved && !loading && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-white"
          style={{ background: "#7c3aed", fontSize: 9, fontWeight: 700 }} title="Diagnóstico salvo no banco">✓</span>
      )}
    </div>
  );
}
/**
 * AcademiaGeneratorButton — autocontido.
 * - Save simples: update + check error (sem .select() que causa falha de tipo)
 * - setQueryData atualiza o cache imediatamente após salvar
 * - hasContent sincroniza badge ✓ tanto na sessão atual quanto ao reabrir o editor
 */
import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AcademiaOption { id: string; text: string; isCorrect: boolean; feedback: string; nextStepId: string; }
interface AcademiaStep  { id: string; type: "intro" | "quiz" | "end"; content: string; badge?: { type: "warning" | "tip"; text: string }; options?: AcademiaOption[]; nextStepId?: string; }
interface AcademiaData  { title: string; subtitle: string; steps: AcademiaStep[]; }

const buildPrompt = (title: string, content: string) => `Você é um especialista em design instrucional para sistemas ERP.
Crie um módulo Academia com exatamente 5 perguntas de múltipla escolha sobre o conteúdo abaixo.

REGRAS:
- 5 perguntas (quiz), 3 opcoes cada (a, b, c), 1 correta
- Feedback curto e direto (maximo 20 palavras por feedback)
- Use texto simples sem emojis no feedback
- Retorne SOMENTE o JSON, sem texto adicional

JSON:
{
  "title": "Academia: TITULO",
  "subtitle": "Teste seus conhecimentos",
  "steps": [
    {"id":"intro","type":"intro","content":"Descricao breve.","nextStepId":"q1"},
    {"id":"q1","type":"quiz","content":"Pergunta 1?","options":[{"id":"a","text":"Op A","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q2"},{"id":"b","text":"Op B","isCorrect":true,"feedback":"Correto!","nextStepId":"q2"},{"id":"c","text":"Op C","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q2"}]},
    {"id":"q2","type":"quiz","content":"Pergunta 2?","options":[{"id":"a","text":"Op A","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q3"},{"id":"b","text":"Op B","isCorrect":true,"feedback":"Correto!","nextStepId":"q3"},{"id":"c","text":"Op C","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q3"}]},
    {"id":"q3","type":"quiz","content":"Pergunta 3?","options":[{"id":"a","text":"Op A","isCorrect":true,"feedback":"Correto!","nextStepId":"q4"},{"id":"b","text":"Op B","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q4"},{"id":"c","text":"Op C","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q4"}]},
    {"id":"q4","type":"quiz","content":"Pergunta 4?","options":[{"id":"a","text":"Op A","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q5"},{"id":"b","text":"Op B","isCorrect":false,"feedback":"Incorreto.","nextStepId":"q5"},{"id":"c","text":"Op C","isCorrect":true,"feedback":"Correto!","nextStepId":"q5"}]},
    {"id":"q5","type":"quiz","content":"Pergunta 5?","options":[{"id":"a","text":"Op A","isCorrect":false,"feedback":"Incorreto.","nextStepId":"end"},{"id":"b","text":"Op B","isCorrect":true,"feedback":"Correto!","nextStepId":"end"},{"id":"c","text":"Op C","isCorrect":false,"feedback":"Incorreto.","nextStepId":"end"}]},
    {"id":"end","type":"end","content":"Parabens! Voce concluiu o modulo."}
  ]
}

Título: ${title}
Conteúdo: ${content.slice(0, 10000)}`;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

async function callGemini(apiKey: string, prompt: string, onWait: (s: number) => void): Promise<AcademiaData> {
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
        const data  = await res.json();
        const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
        if (s === -1 || e < s) throw new Error("IA não retornou JSON. Tente novamente.");
        let parsed: AcademiaData;
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

export function AcademiaGeneratorButton({ pageId, pageTitle, pageContent, hasContent = false }: Props) {
  const [loading, setLoading]     = useState(false);
  const [saved, setSaved]         = useState(hasContent);
  const [justDone, setJustDone]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast }                 = useToast();
  const queryClient               = useQueryClient();

  // Sincroniza badge quando a prop muda (ex: ao trocar de página no editor)
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

  const handleGenerate = async () => {
    if (!pageId)             { toast({ title: "Salve a página primeiro", variant: "destructive" }); return; }
    if (!pageContent.trim()) { toast({ title: "Página sem conteúdo", variant: "destructive" }); return; }
    const apiKey = localStorage.getItem("gemini_key") ?? localStorage.getItem("anthropic_key") ?? "";
    if (!apiKey)             { toast({ title: "Chave Gemini não configurada", description: "Configure em Configurações.", variant: "destructive" }); return; }

    setLoading(true);
    try {
      const academia = await callGemini(apiKey, buildPrompt(pageTitle, pageContent), startCountdown);

      // Save simples — apenas verifica error, sem .select() que falha nos tipos
      const { error } = await supabase
        .from("doc_pages")
        .update({ academia_content: academia } as any)
        .eq("id", pageId);

      if (error) throw new Error(`Erro ao salvar: ${error.message}`);

      // Atualiza o cache diretamente (mais rápido que invalidate + refetch)
      // Isso garante que ao reabrir o editor o hasContent esteja correto
      queryClient.setQueryData<any[]>(["doc_pages_all"], (old) =>
        old?.map((p) => p.id === pageId ? { ...p, academia_content: academia } : p) ?? old
      );
      // Invalida o índice de academia para ele reaparecer em /academia
      queryClient.invalidateQueries({ queryKey: ["academia_pages"] });

      setSaved(true); setJustDone(true);
      setTimeout(() => setJustDone(false), 3000);
      toast({ title: "🎓 Academia gerada!", description: `${academia.steps.filter((s) => s.type === "quiz").length} perguntas criadas para "${pageTitle}".` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Erro ao gerar Academia", description: msg, variant: "destructive" });
    } finally {
      setLoading(false); setCountdown(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const isSavedIdle = saved && !loading && !justDone;

  return (
    <div className="relative inline-flex">
      <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={loading || !pageId}
        className={`gap-2 min-w-[165px] justify-center transition-all ${
          justDone      ? "border-green-400 text-green-700 bg-green-50"
          : isSavedIdle ? "border-violet-400 text-violet-700 bg-violet-50/60 hover:bg-violet-50"
          :               "border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400"
        }`}>
        {loading && countdown > 0 ? (
          <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Aguardando… {countdown}s</span></>
        ) : loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Academia…</>
        ) : justDone ? (
          <><CheckCircle2 className="h-4 w-4 text-green-600" /> Academia salva!</>
        ) : isSavedIdle ? (
          <><RefreshCw className="h-3.5 w-3.5" /> Regen. Academia IA</>
        ) : (
          <><Sparkles className="h-4 w-4" /> Gerar Academia IA</>
        )}
      </Button>
      {saved && !loading && (
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-white"
          style={{ background: "#7c3aed", fontSize: 9, fontWeight: 700 }} title="Academia salva no banco">✓</span>
      )}
    </div>
  );
}
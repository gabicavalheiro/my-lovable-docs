/**
 * AcademiaGeneratorButton — completamente autocontido.
 * A chamada ao Gemini, os tipos e o retry estão aqui dentro.
 * Elimina qualquer dependência circular que impedia a geração.
 */

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ── Tipos da Academia ─────────────────────────────────────────────────────────

interface AcademiaOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  nextStepId: string;
}

interface AcademiaStep {
  id: string;
  type: "intro" | "quiz" | "end";
  content: string;
  badge?: { type: "warning" | "tip"; text: string };
  options?: AcademiaOption[];
  nextStepId?: string;
}

interface AcademiaData {
  title: string;
  subtitle: string;
  steps: AcademiaStep[];
}

// ── Prompt do Gemini ──────────────────────────────────────────────────────────

const buildPrompt = (title: string, content: string) => `Você é um especialista em design instrucional para sistemas ERP.
Analise o conteúdo abaixo e crie um módulo "Academia" interativo com 5 perguntas.

REGRAS:
- Exatamente 5 perguntas de múltipla escolha, 3 opções cada (a, b, c), 1 correta
- Feedback explicativo: use ✅ para correto e ❌ para incorreto
- Foque em regras práticas, fluxos e alertas importantes
- Retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON

JSON esperado:
{
  "title": "Academia: ${title}",
  "subtitle": "Valide seu domínio operacional sobre este módulo",
  "steps": [
    { "id": "intro", "type": "intro", "content": "Descrição de 2-3 linhas do que será testado.", "nextStepId": "q1" },
    {
      "id": "q1", "type": "quiz", "content": "Pergunta 1?",
      "options": [
        { "id": "a", "text": "Opção A", "isCorrect": false, "feedback": "❌ Explicação.", "nextStepId": "q2" },
        { "id": "b", "text": "Opção B", "isCorrect": true,  "feedback": "✅ Correto! Explicação.", "nextStepId": "q2" },
        { "id": "c", "text": "Opção C", "isCorrect": false, "feedback": "❌ Explicação.", "nextStepId": "q2" }
      ]
    },
    { "id": "q2", "type": "quiz", "content": "Pergunta 2?", "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q3"},{"id":"b","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q3"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q3"}] },
    { "id": "q3", "type": "quiz", "content": "Pergunta 3?", "badge": { "type": "warning", "text": "Atenção: regra crítica." }, "options": [{"id":"a","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q4"},{"id":"b","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q4"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q4"}] },
    { "id": "q4", "type": "quiz", "content": "Pergunta 4?", "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q5"},{"id":"b","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q5"},{"id":"c","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q5"}] },
    { "id": "q5", "type": "quiz", "content": "Pergunta 5?", "badge": { "type": "tip", "text": "Dica operacional." }, "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"end"},{"id":"b","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"end"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"end"}] },
    { "id": "end", "type": "end", "content": "Mensagem de conclusão motivacional (2-3 linhas)." }
  ]
}

---
Título: "${title}"
Conteúdo do manual:
${content.slice(0, 10000)}`;

// ── Chamada direta ao Gemini com retry ────────────────────────────────────────

// Modelos em ordem de preferência — tenta o próximo se o atual não estiver disponível
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

async function callGeminiDirectly(
  apiKey: string,
  prompt: string,
  onWait: (s: number) => void
): Promise<AcademiaData> {
  let lastError = "Nenhum modelo Gemini disponível para esta chave.";

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    console.log("[Academia] Tentando modelo:", model);
    let modelSkip = false;

    for (let attempt = 0; attempt < 4; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 4000 },
          }),
        });
      } catch (networkErr) {
        throw new Error("Erro de rede. Verifique sua conexão.");
      }

      if (res.ok) {
        const data = await res.json();
        const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const clean = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        let parsed: AcademiaData;
        try {
          parsed = JSON.parse(clean);
        } catch {
          throw new Error("IA retornou formato inválido. Tente novamente.");
        }
        if (!parsed?.steps?.length) throw new Error("Resposta incompleta da IA.");
        console.log("[Academia] Sucesso com modelo:", model);
        return parsed;
      }

      const errBody = await res.json().catch(() => ({}));
      const msg: string = (errBody as any)?.error?.message ?? `Erro HTTP ${res.status}`;
      lastError = msg;

      // Modelo descontinuado ou não disponível → tenta o próximo da lista
      if (res.status === 404 || res.status === 400) {
        console.warn("[Academia] Modelo não disponível:", model, "→ tentando próximo");
        modelSkip = true;
        break;
      }

      // Rate-limit → espera e retenta o mesmo modelo
      if (res.status === 429 || res.status === 503) {
        const match = msg.match(/retry in ([\d.]+)s/i);
        const wait = match ? Math.ceil(parseFloat(match[1])) + 1 : 30;
        console.log("[Academia] Rate-limit, aguardando", wait, "s...");
        onWait(wait);
        await new Promise<void>((r) => setTimeout(r, wait * 1000));
        onWait(0);
        continue;
      }

      // Qualquer outro erro (auth, etc.) → falha imediata
      throw new Error(msg);
    }

    if (modelSkip) continue;
  }

  throw new Error(lastError);
}


// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  pageId: string;
  pageTitle: string;
  pageContent: string;
}

export function AcademiaGeneratorButton({ pageId, pageTitle, pageContent }: Props) {
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast }                 = useToast();

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCountdown = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (seconds <= 0) { setCountdown(0); return; }
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleGenerate = async () => {
    if (!pageId) {
      toast({ title: "Salve a página primeiro", description: "A página precisa ter sido salva para gerar a Academia.", variant: "destructive" });
      return;
    }
    if (!pageContent.trim()) {
      toast({ title: "Página sem conteúdo", description: "Adicione conteúdo antes de gerar a Academia.", variant: "destructive" });
      return;
    }

    const apiKey = localStorage.getItem("gemini_key")
      ?? localStorage.getItem("anthropic_key")  // compatibilidade com chave antiga
      ?? "";

    if (!apiKey) {
      toast({
        title: "Chave Gemini não encontrada",
        description: "Cole a chave (AIza...) na aba Importar. Grátis em aistudio.google.com",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDone(false);

    try {
      console.log("[Academia] Iniciando geração para:", pageTitle);
      const academia = await callGeminiDirectly(apiKey, buildPrompt(pageTitle, pageContent), startCountdown);
      console.log("[Academia] Gerada com sucesso:", academia.steps.length, "steps");

      const { error } = await supabase
        .from("doc_pages")
        .update({ academia_content: academia } as any)
        .eq("id", pageId);

      if (error) {
        console.error("[Academia] Erro Supabase:", error);
        throw new Error(error.message);
      }

      console.log("[Academia] Salva no Supabase ✓");
      setDone(true);
      toast({
        title: "🎓 Academia gerada!",
        description: `${academia.steps.filter((s) => s.type === "quiz").length} perguntas criadas para "${pageTitle}".`,
      });
      setTimeout(() => setDone(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Academia] Erro:", msg);
      toast({ title: "Erro ao gerar Academia", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setCountdown(0);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={loading || !pageId}
      className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 min-w-[165px] justify-center"
    >
      {loading && countdown > 0 ? (
        <><Clock className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Aguardando… {countdown}s</span></>
      ) : loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando Academia…</>
      ) : done ? (
        <><CheckCircle2 className="h-4 w-4 text-green-600" /> Academia gerada!</>
      ) : (
        <><Sparkles className="h-4 w-4" /> Gerar Academia IA</>
      )}
    </Button>
  );
}
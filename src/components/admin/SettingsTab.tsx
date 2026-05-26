/**
 * SettingsTab — aba de Configurações do Admin
 * Coloque em: src/components/admin/SettingsTab.tsx
 */

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Key, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GEMINI_MODELS } from "@/lib/gemini";

const LS_KEY = "gemini_key";

async function testGeminiKey(key: string): Promise<{ ok: boolean; model?: string; error?: string }> {
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ok" }] }],
            generationConfig: { maxOutputTokens: 5 },
          }),
        }
      );
      if (res.ok) return { ok: true, model };
      if (res.status === 404 || res.status === 400) continue;
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: (err as any)?.error?.message ?? `Erro ${res.status}` };
    } catch {
      return { ok: false, error: "Erro de rede. Verifique sua conexão." };
    }
  }
  return { ok: false, error: "Nenhum modelo disponível para esta chave. Verifique se a chave é válida e se o projeto tem a Gemini API ativada." };
}

type TestStatus = "idle" | "loading" | "ok" | "fail";

export function SettingsTab() {
  const [key, setKey]       = useState(() => localStorage.getItem(LS_KEY) ?? "");
  const [show, setShow]     = useState(false);
  const [status, setStatus] = useState<TestStatus>("idle");
  const [okModel, setOkModel] = useState("");
  const [errMsg, setErrMsg]   = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => { setKey(localStorage.getItem(LS_KEY) ?? ""); }, []);

  const handleSave = () => {
    localStorage.setItem(LS_KEY, key.trim());
    setSaved(true); setStatus("idle");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem(LS_KEY);
    setKey(""); setStatus("idle"); setOkModel(""); setErrMsg("");
  };

  const handleTest = async () => {
    if (!key.trim()) return;
    setStatus("loading"); setOkModel(""); setErrMsg("");
    const result = await testGeminiKey(key.trim());
    if (result.ok) { setStatus("ok"); setOkModel(result.model ?? ""); }
    else           { setStatus("fail"); setErrMsg(result.error ?? "Chave inválida."); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências do painel administrativo.</p>
      </div>

      {/* ── API Gemini ── */}
      <section className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--brand-gradient)" }}>
            <Key className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Chave da API Gemini</p>
            <p className="text-xs text-muted-foreground">PDF, auto-tag, Academia IA e Diagnóstico</p>
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            Obter grátis <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Chave da API</label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                placeholder="AIza..."
                value={key}
                onChange={(e) => { setKey(e.target.value); setStatus("idle"); }}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
              />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={show ? "Ocultar" : "Mostrar"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {status === "ok" && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Chave válida — modelo <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{okModel}</code>
            </div>
          )}
          {status === "fail" && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{errMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleSave} disabled={!key.trim()}
              className="gap-2 text-white border-0" style={{ background: "var(--brand-gradient)" }}>
              {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Salvo!</> : "Salvar chave"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleTest}
              disabled={!key.trim() || status === "loading"} className="gap-2">
              {status === "loading"
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testando...</>
                : "Testar conexão"}
            </Button>
            {key && (
              <Button size="sm" variant="ghost" onClick={handleClear}
                className="gap-2 text-muted-foreground hover:text-destructive ml-auto">
                <Trash2 className="h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
            🔒 Salva <strong>apenas no seu navegador</strong> (localStorage) — nunca enviada a servidores
            além da API do Google. Cada usuário configura a própria chave.
          </p>
        </div>
      </section>

      {/* ── Info de uso ── */}
      <section className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <p className="text-sm font-semibold text-foreground">Para que a chave é usada</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <ul className="space-y-3 text-sm">
            {[
              { e: "📄", t: "Importação de PDF",  d: "Converte páginas de PDF em Markdown com OCR via Gemini Vision." },
              { e: "🏷️", t: "Auto-tag IA",        d: "Gera tags relevantes automaticamente ao importar ou editar páginas." },
              { e: "🎓", t: "Academia IA",        d: "Cria quizzes interativos de múltipla escolha para cada página." },
              { e: "🔍", t: "Diagnóstico IA",     d: "Gera fluxos diagnósticos interativos para guiar o leitor." },
            ].map(({ e, t, d }) => (
              <li key={t} className="flex gap-3">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{e}</span>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t}</span> — {d}
                </div>
              </li>
            ))}
          </ul>
          <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
            <strong className="text-foreground">Modelos (fallback automático):</strong>{" "}
            {GEMINI_MODELS.map((m, i) => (
              <span key={m}><code className="font-mono">{m}</code>{i < GEMINI_MODELS.length - 1 ? " → " : ""}</span>
            ))}.{" "}
            Limite gratuito: 1.500 req/dia.{" "}
            <a href="https://aistudio.google.com" target="_blank" rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground">
              Google AI Studio ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
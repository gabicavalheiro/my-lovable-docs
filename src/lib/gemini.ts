/* ─────────────────────────────────────────────────────────────────────────────
 * Cliente Gemini 2.0 Flash
 * Chave grátis em: https://aistudio.google.com  (1.500 req/dia · 15 req/min)
 *
 * Inclui retry automático quando a API retorna rate-limit (429).
 * A mensagem de erro contém "Please retry in Xs" — parseamos e esperamos.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { AcademiaData } from "@/lib/generate-academia";

const MODEL    = "gemini-2.0-flash-lite";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/* ── Callback de progresso para o UI ────────────────────────────────────────── */
export type OnRetry = (waitSeconds: number) => void;

/* ── Sleep helper ────────────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ── Extrai segundos de espera da mensagem de erro do Google ─────────────────── */
function parseRetryAfter(msg: string): number | null {
  const match = msg.match(/retry in ([\d.]+)s/i);
  return match ? Math.ceil(parseFloat(match[1])) + 1 : null;
}

/* ── Chamada base com retry automático ───────────────────────────────────────── */
async function callGemini(
  apiKey: string,
  parts: object[],
  maxTokens = 1000,
  onRetry?: OnRetry,
  maxRetries = 3
): Promise<string> {
  const url = `${BASE_URL}?key=${apiKey}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    const err  = await res.json().catch(() => ({}));
    const msg  = (err as any)?.error?.message ?? `Erro HTTP ${res.status}`;
    const wait = parseRetryAfter(msg);

    // Se for rate-limit e ainda temos tentativas, espera e tenta de novo
    if ((res.status === 429 || res.status === 503) && wait && attempt < maxRetries) {
      onRetry?.(wait);
      await sleep(wait * 1000);
      onRetry?.(0);
      continue;
    }

    throw new Error(msg);
  }

  throw new Error("Limite de tentativas atingido. Tente novamente em alguns segundos.");
}

/* ── 1. Gerar tags ───────────────────────────────────────────────────────────── */
export async function geminiGenerateTags(
  title: string,
  content: string,
  apiKey: string,
  onRetry?: OnRetry
): Promise<string[]> {
  if (!apiKey?.trim()) return [];

  const prompt = `Analise este conteúdo de documentação ERP/PDV e retorne 3-8 tags relevantes.

REGRAS: português, minúsculas, sem acentos, hífen para palavras compostas.
Exemplos: "nota-fiscal", "pdv", "entrada-estoque"

Retorne APENAS um JSON array, sem texto adicional. Exemplo: ["nota-fiscal","pdv"]

Título: ${title}
Conteúdo: ${content.slice(0, 3000)}`;

  try {
    const raw   = await callGemini(apiKey, [{ text: prompt }], 200, onRetry);
    const clean = raw.replace(/```json?|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) {
      return parsed.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean);
    }
  } catch { }
  return [];
}

/* ── 2. PDF (página como imagem) → Markdown ──────────────────────────────────── */
export async function geminiPageToMarkdown(
  base64Image: string,
  imageUrls: string[],
  apiKey: string,
  onRetry?: OnRetry
): Promise<string> {
  if (!apiKey?.trim()) throw new Error("Chave da API Gemini não configurada.");

  const imgList =
    imageUrls.length > 0
      ? `\n\nImagens extraídas (na ordem):\n${imageUrls.map((u, i) => `${i + 1}: ${u}`).join("\n")}`
      : "";

  const text = `Converta esta página para Markdown GFM.

Regras:
- H1→# H2→## H3→### Negrito→** Itálico→* Callout→> 🔔
- Preserve emojis e formatação original
${imageUrls.length > 0
    ? `- Insira as imagens inline com ![descrição](URL) na ordem correta${imgList}`
    : "- Sem imagens para inserir"}

Retorne APENAS o markdown, sem texto explicativo.`;

  return callGemini(
    apiKey,
    [
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      { text },
    ],
    4000,
    onRetry
  );
}

/* ── 3. Gerar Academia (quiz interativo) ─────────────────────────────────────── */
const ACADEMIA_PROMPT_TEMPLATE = (title: string, content: string) => `Você é um especialista em design instrucional para sistemas ERP empresariais.
Crie um módulo "Academia" interativo a partir da página de documentação abaixo.

REGRAS OBRIGATÓRIAS:
1. Gere EXATAMENTE 5 perguntas de múltipla escolha sobre os conceitos mais críticos
2. Cada pergunta deve ter EXATAMENTE 3 opções (a, b, c) — somente 1 correta
3. Feedback EXPLICATIVO e DIDÁTICO: por que a certa está certa e as erradas estão erradas
4. Priorize: fluxos operacionais, regras de negócio, alertas, dados obrigatórios
5. Use ✅ no feedback correto e ❌ nos incorretos

Retorne SOMENTE o JSON abaixo, sem markdown, sem texto antes ou depois:
{
  "title": "Academia: ${title}",
  "subtitle": "Valide seu domínio operacional sobre este módulo",
  "steps": [
    { "id": "intro", "type": "intro", "content": "2-3 linhas descrevendo o que será testado.", "nextStepId": "q1" },
    { "id": "q1", "type": "quiz", "content": "Pergunta 1?",
      "options": [
        { "id": "a", "text": "Opção A", "isCorrect": false, "feedback": "❌ Explicação.", "nextStepId": "q2" },
        { "id": "b", "text": "Opção B", "isCorrect": true,  "feedback": "✅ Correto! Explicação.", "nextStepId": "q2" },
        { "id": "c", "text": "Opção C", "isCorrect": false, "feedback": "❌ Explicação.", "nextStepId": "q2" }
      ]},
    { "id": "q2", "type": "quiz", "content": "Pergunta 2?", "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q3"},{"id":"b","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q3"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q3"}]},
    { "id": "q3", "type": "quiz", "content": "Pergunta 3?", "badge": { "type": "warning", "text": "Regra crítica relacionada." }, "options": [{"id":"a","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q4"},{"id":"b","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q4"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q4"}]},
    { "id": "q4", "type": "quiz", "content": "Pergunta 4?", "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q5"},{"id":"b","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"q5"},{"id":"c","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"q5"}]},
    { "id": "q5", "type": "quiz", "content": "Pergunta 5?", "badge": { "type": "tip", "text": "Dica operacional." }, "options": [{"id":"a","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"end"},{"id":"b","text":"...","isCorrect":true,"feedback":"✅ ...","nextStepId":"end"},{"id":"c","text":"...","isCorrect":false,"feedback":"❌ ...","nextStepId":"end"}]},
    { "id": "end", "type": "end", "content": "Mensagem de conclusão motivacional (2-3 linhas)." }
  ]
}

---
Conteúdo do manual:
${content.slice(0, 12000)}`;

export async function geminiGenerateAcademia(
  pageTitle: string,
  pageContent: string,
  apiKey: string,
  onRetry?: OnRetry
): Promise<AcademiaData> {
  if (!apiKey?.trim()) throw new Error("Chave da API Gemini não informada.");

  const raw   = await callGemini(apiKey, [{ text: ACADEMIA_PROMPT_TEMPLATE(pageTitle, pageContent) }], 4000, onRetry);
  const clean = raw.replace(/```json?|```/g, "").trim();

  let parsed: AcademiaData;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("A IA retornou um formato inválido. Tente novamente.");
  }

  if (!parsed?.steps?.length) throw new Error("Resposta da IA incompleta. Tente novamente.");
  return parsed;
}
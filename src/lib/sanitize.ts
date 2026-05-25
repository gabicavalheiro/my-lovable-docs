/**
 * Sanitização leve de HTML para conteúdo Markdown renderizado.
 *
 * Remove vetores de XSS (tags <script>, event handlers on*, javascript: hrefs)
 * sem depender de biblioteca externa. O conteúdo vem de admins autenticados,
 * mas seguimos o princípio de defesa em profundidade.
 */

/** Tags explicitamente proibidas */
const FORBIDDEN_TAGS = /(<\s*\/?\s*(script|iframe|object|embed|form|input|button|select|textarea|base|link|meta|style)\b[^>]*>)/gi;

/** Atributos de event handler (onclick, onerror, onload …) */
const EVENT_HANDLERS = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;

/** hrefs e srcs com javascript: ou data: */
const DANGEROUS_PROTOCOL = /(href|src|action)\s*=\s*["']?\s*(javascript:|data:text\/html|vbscript:)/gi;

/**
 * Retorna o conteúdo sanitizado, seguro para renderização com rehype-raw.
 */
export function sanitizeMarkdown(content: string): string {
  return content
    .replace(FORBIDDEN_TAGS, "<!-- removed -->")
    .replace(EVENT_HANDLERS, "")
    .replace(DANGEROUS_PROTOCOL, "$1=\"#\"");
}

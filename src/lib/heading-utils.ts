/**
 * Funções compartilhadas para geração de IDs de headings.
 * FONTE ÚNICA — importada por MarkdownRenderer, DocTableOfContents e useDocSearch.
 * Alterar aqui reflete em todos os pontos automaticamente.
 */

/**
 * Converte o texto de um heading em um ID de âncora válido e estável.
 * Remove acentos, caracteres especiais e normaliza hífens.
 */
export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos (á→a, ç→c …)
    .replace(/[^\w\s-]/g, "")          // remove *, ?, !, emojis, etc.
    .replace(/\s+/g, "-")              // espaços → hífen
    .replace(/-+/g, "-")               // hífens duplos → simples
    .replace(/^-|-$/g, "")             // remove hífens nas bordas
    .trim();
}

/**
 * Remove formatação Markdown inline (negrito, itálico, código, links)
 * para que o texto exibido no TOC fique limpo.
 */
export function stripMarkdownInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **negrito**
    .replace(/\*(.+?)\*/g, "$1")        // *itálico*
    .replace(/__(.+?)__/g, "$1")        // __negrito__
    .replace(/_(.+?)_/g, "$1")          // _itálico_
    .replace(/`(.+?)`/g, "$1")          // `código`
    .replace(/~~(.+?)~~/g, "$1")        // ~~tachado~~
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [link](url)
    .trim();
}

/**
 * Encontra o ID do heading mais próximo ACIMA de um índice no conteúdo markdown.
 * Usado pelo motor de busca para ancorar resultados ao heading correto.
 */
export function nearestHeadingId(content: string, idx: number): string | null {
  const regex = /^#{1,4}\s+(.+)$/gm;
  let lastId: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > idx) break;
    lastId = headingToId(stripMarkdownInline(m[1].trim()));
  }
  return lastId;
}

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { headingToId } from "@/lib/heading-utils";
import { sanitizeMarkdown } from "@/lib/sanitize";

interface Props {
  content: string;
}

/* ─── Extração de texto puro dos children React ────────────────────────────────
 * Necessário porque ReactMarkdown passa arrays ou elementos quando o heading
 * contém formatação inline como **negrito** ou *itálico*.
 *
 * Definida fora do componente para não ser recriada a cada render.
 */
function childrenToText(children: React.ReactNode): string {
  if (children === null || children === undefined) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number" || typeof children === "boolean")
    return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (React.isValidElement(children)) {
    return childrenToText((children.props as { children?: React.ReactNode }).children);
  }
  return "";
}

/* ─── Componentes de heading ────────────────────────────────────────────────────
 * Criados UMA VEZ fora do escopo do componente.
 * Sem isso, React reconcilia como componentes diferentes a cada render, causando
 * re-mount desnecessário e perdendo o scroll position do TOC.
 */
const H1 = ({ children, ...props }: React.ComponentPropsWithoutRef<"h1">) => (
  <h1 id={headingToId(childrenToText(children))} {...props}>{children}</h1>
);
const H2 = ({ children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
  <h2 id={headingToId(childrenToText(children))} {...props}>{children}</h2>
);
const H3 = ({ children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
  <h3 id={headingToId(childrenToText(children))} {...props}>{children}</h3>
);
const H4 = ({ children, ...props }: React.ComponentPropsWithoutRef<"h4">) => (
  <h4 id={headingToId(childrenToText(children))} {...props}>{children}</h4>
);

/** Mapeamento estático — nunca recriado */
const MARKDOWN_COMPONENTS = { h1: H1, h2: H2, h3: H3, h4: H4 } as const;

/** Plugins estáticos — nunca recriados */
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw];

/* ─── Componente principal ──────────────────────────────────────────────────────
 * memo() evita re-render quando o conteúdo não mudou.
 * Isso é crítico: o componente pai (DocsPage) pode re-renderizar por outros
 * motivos (ex: sidebar hover, TOC scroll) sem que o content tenha mudado.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: Props) {
  // Sanitiza uma vez, memoizado pelo conteúdo
  const safeContent = useMemo(() => sanitizeMarkdown(content), [content]);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
});

// Re-exporta para compatibilidade com DocTableOfContents
export { headingToId };
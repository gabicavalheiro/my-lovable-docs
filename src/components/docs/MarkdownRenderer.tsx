import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Props {
  content: string;
}

/**
 * Extrai texto puro de children React (recursivo).
 * Necessário porque ReactMarkdown pode passar arrays ou elementos
 * quando o heading tem formatação inline como **negrito** ou *itálico*.
 */
function childrenToText(children: React.ReactNode): string {
  if (children === null || children === undefined) return "";
  if (typeof children === "string") return children;
  if (typeof children === "number" || typeof children === "boolean") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (React.isValidElement(children)) {
    return childrenToText((children.props as any).children);
  }
  return "";
}

/** Deve ser IDÊNTICA à função headingToId do DocTableOfContents */
export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove acentos
    .replace(/[^\w\s-]/g, "")          // remove caracteres especiais (*, ?, !, emojis…)
    .replace(/\s+/g, "-")              // espaços → hífen
    .replace(/-+/g, "-")               // hífens duplos → simples
    .replace(/^-|-$/g, "")             // remove hífens nas bordas
    .trim();
}

function makeHeading(Tag: "h1" | "h2" | "h3" | "h4") {
  return ({ children, ...props }: any) => {
    const id = headingToId(childrenToText(children));
    return <Tag id={id} {...props}>{children}</Tag>;
  };
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: makeHeading("h1"),
          h2: makeHeading("h2"),
          h3: makeHeading("h3"),
          h4: makeHeading("h4"),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
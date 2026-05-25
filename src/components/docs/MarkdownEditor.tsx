import { useRef, useState, useCallback, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownRenderer } from "@/components/docs/MarkdownRenderer";
import {
  Bold, Italic, Heading2, Heading3, Code, Link, Image, List,
  ListOrdered, Eye, EyeOff, Columns2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]);

type ViewMode = "edit" | "preview" | "split";

interface Props {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}

/* ─── Componente ─────────────────────────────────────────────────────────── */
export const MarkdownEditor = memo(function MarkdownEditor({
  value,
  onChange,
  minRows = 20,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /* ── Helpers de inserção no cursor ───────────────────────────────────── */
  const insertAt = useCallback(
    (before: string, after = "", placeholder = "") => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || placeholder;
      const newValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        const cursor = start + before.length + selected.length + after.length;
        el.setSelectionRange(cursor, cursor);
      });
    },
    [value, onChange]
  );

  const wrapSelection = useCallback(
    (mark: string, placeholder: string) => insertAt(mark, mark, placeholder),
    [insertAt]
  );

  /* ── Upload de imagem (com validação de segurança) ───────────────────── */
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);

      // Validação de tipo
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setUploadError(`Tipo não permitido: ${file.type}`);
        return;
      }

      // Validação de tamanho
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setUploadError(`Imagem muito grande. Máximo: ${MAX_IMAGE_SIZE_MB} MB.`);
        return;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        // Path com prefixo de timestamp + random para evitar colisão
        const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error } = await supabase.storage
          .from("docs-images")
          .upload(path, file, { upsert: false, contentType: file.type });

        if (error) throw error;

        const { data } = supabase.storage.from("docs-images").getPublicUrl(path);
        insertAt(`![${file.name}](${data.publicUrl})`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setUploadError(`Erro ao fazer upload: ${msg}`);
      } finally {
        setUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    },
    [insertAt]
  );

  /* ── Toolbar ─────────────────────────────────────────────────────────── */
  // useMemo para não recriar o array de ferramentas a cada render
  const tools = useMemo(
    () => [
      { icon: Bold,        label: "Negrito",        action: () => wrapSelection("**", "texto em negrito") },
      { icon: Italic,      label: "Itálico",         action: () => wrapSelection("_", "texto em itálico") },
      { icon: Heading2,    label: "Título H2",       action: () => insertAt("\n## ", "", "Título") },
      { icon: Heading3,    label: "Título H3",       action: () => insertAt("\n### ", "", "Título") },
      { icon: Code,        label: "Código",          action: () => wrapSelection("`", "código") },
      { icon: Link,        label: "Link",            action: () => insertAt("[", "](https://)", "texto do link") },
      { icon: List,        label: "Lista",           action: () => insertAt("\n- ", "", "item") },
      { icon: ListOrdered, label: "Lista numerada",  action: () => insertAt("\n1. ", "", "item") },
    ],
    [insertAt, wrapSelection]
  );

  const minHeightStyle = useMemo(
    () => ({ minHeight: `${minRows * 1.5}rem` }),
    [minRows]
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            onClick={t.action}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Upload de imagem */}
        <button
          type="button"
          title="Inserir imagem"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept={[...ALLOWED_IMAGE_TYPES].join(",")}
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="w-px h-5 bg-border mx-1" />

        {/* Modos de visualização */}
        {(
          [
            { mode: "edit" as ViewMode,    icon: EyeOff,   title: "Editar" },
            { mode: "split" as ViewMode,   icon: Columns2, title: "Split" },
            { mode: "preview" as ViewMode, icon: Eye,      title: "Preview" },
          ] as const
        ).map(({ mode, icon: Icon, title }) => (
          <button
            key={mode}
            type="button"
            title={title}
            onClick={() => setViewMode(mode)}
            className={cn(
              "p-1.5 rounded transition-colors text-muted-foreground",
              viewMode === mode
                ? "bg-muted text-foreground"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      {/* Erro de upload */}
      {uploadError && (
        <div className="px-4 py-2 text-xs text-destructive bg-destructive/10 border-b border-destructive/20 flex items-center justify-between">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-2 hover:opacity-70"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Área de edição */}
      <div className={cn("flex", viewMode === "split" ? "divide-x divide-border" : "")}>
        {viewMode !== "preview" && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={"# Título da página\n\nEscreva aqui em Markdown...\n\n## Seção\n\nParágrafo normal."}
            rows={minRows}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full p-4 text-sm font-mono bg-background text-foreground resize-none outline-none placeholder:text-muted-foreground/50"
            style={minHeightStyle}
          />
        )}

        {viewMode !== "edit" && (
          <div
            className="flex-1 overflow-y-auto p-4 bg-background"
            style={minHeightStyle}
          >
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nada para pré-visualizar ainda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
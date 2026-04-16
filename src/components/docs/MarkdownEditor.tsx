import { useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarkdownRenderer } from "@/components/docs/MarkdownRenderer";
import {
  Bold, Italic, Heading2, Heading3, Code, Link, Image, List,
  ListOrdered, Eye, EyeOff, Columns2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}

type ViewMode = "edit" | "preview" | "split";

export function MarkdownEditor({ value, onChange, minRows = 20 }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* ---------- helpers de inserção no cursor ---------- */
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
      // reposiciona o cursor
      setTimeout(() => {
        el.focus();
        const cursor = start + before.length + selected.length + after.length;
        el.setSelectionRange(cursor, cursor);
      }, 0);
    },
    [value, onChange]
  );

  const wrapSelection = (mark: string, placeholder: string) =>
    insertAt(mark, mark, placeholder);

  /* ---------- upload de imagem ---------- */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("docs-images")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("docs-images").getPublicUrl(path);
      insertAt(`![${file.name}](${data.publicUrl})`);
    } catch (err: any) {
      alert("Erro ao fazer upload da imagem: " + err.message);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  /* ---------- botões da toolbar ---------- */
  const tools = [
    {
      icon: Bold,
      label: "Negrito",
      action: () => wrapSelection("**", "texto em negrito"),
    },
    {
      icon: Italic,
      label: "Itálico",
      action: () => wrapSelection("_", "texto em itálico"),
    },
    {
      icon: Heading2,
      label: "Título H2",
      action: () => insertAt("\n## ", "", "Título"),
    },
    {
      icon: Heading3,
      label: "Título H3",
      action: () => insertAt("\n### ", "", "Título"),
    },
    {
      icon: Code,
      label: "Código",
      action: () => wrapSelection("`", "código"),
    },
    {
      icon: Link,
      label: "Link",
      action: () => insertAt("[", "](https://)", "texto do link"),
    },
    {
      icon: List,
      label: "Lista",
      action: () => insertAt("\n- ", "", "item"),
    },
    {
      icon: ListOrdered,
      label: "Lista numerada",
      action: () => insertAt("\n1. ", "", "item"),
    },
  ];

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

        {/* Separador */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Upload de imagem */}
        <button
          type="button"
          title="Inserir imagem"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Separador */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Modos de visualização */}
        <button
          type="button"
          title="Editar"
          onClick={() => setViewMode("edit")}
          className={cn(
            "p-1.5 rounded transition-colors text-muted-foreground",
            viewMode === "edit" ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground"
          )}
        >
          <EyeOff className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Split"
          onClick={() => setViewMode("split")}
          className={cn(
            "p-1.5 rounded transition-colors text-muted-foreground",
            viewMode === "split" ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground"
          )}
        >
          <Columns2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Preview"
          onClick={() => setViewMode("preview")}
          className={cn(
            "p-1.5 rounded transition-colors text-muted-foreground",
            viewMode === "preview" ? "bg-muted text-foreground" : "hover:bg-muted hover:text-foreground"
          )}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* Área de edição */}
      <div className={cn("flex", viewMode === "split" ? "divide-x divide-border" : "")}>
        {/* Editor */}
        {viewMode !== "preview" && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={"# Título da página\n\nEscreva aqui em Markdown...\n\n## Seção\n\nParágrafo normal."}
            rows={minRows}
            className="flex-1 w-full p-4 text-sm font-mono bg-background text-foreground resize-none outline-none placeholder:text-muted-foreground/50"
            style={{ minHeight: `${minRows * 1.5}rem` }}
          />
        )}

        {/* Preview */}
        {viewMode !== "edit" && (
          <div
            className="flex-1 overflow-y-auto p-4 bg-background"
            style={{ minHeight: `${minRows * 1.5}rem` }}
          >
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Nada para pré-visualizar ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, KeyboardEvent, useMemo } from "react";
import {
  useModules, useAllPages, useUpsertModule, useUpsertPage,
  useDeleteModule, useDeletePage, type DocModule, type DocPage,
} from "@/hooks/useDocData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Edit, Upload, LogOut, BookOpen, FileText,
  FolderOpen, Eye, X, Tag, Sparkles, ChevronRight, ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";

// ─── Utilitários ─────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function sanitizeContent(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\uD800|\uDBFF|\uDC00|\uDFFF/g, "")
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")
    .replace(/\\u[0-9a-fA-F]{4}/g, (m) => {
      try { return JSON.parse(`"${m}"`); } catch { return ""; }
    });
}

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp|svg|avif|bmp|tiff?)$/i;
const MIME_MAP: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  avif: "image/avif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff",
};

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange, onAutoTag, loadingAutoTag }: {
  tags: string[];
  onChange: (tags: string[]) => void;
  onAutoTag?: () => void;
  loadingAutoTag?: boolean;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key)) {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className="min-h-[40px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-border rounded-md bg-background cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)); }} className="hover:text-destructive transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? "Digite uma tag e pressione Enter..." : ""}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
      />
      {onAutoTag && (
        <button type="button" onClick={onAutoTag} disabled={loadingAutoTag} title="Gerar tags com IA"
          className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 flex items-center gap-1 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          {loadingAutoTag ? "Gerando..." : "Auto-tag IA"}
        </button>
      )}
    </div>
  );
}

// ─── Tipo de módulo com parent ────────────────────────────────────────────────

type DocModuleWithParent = DocModule & { parent_module_id?: string | null };

type Tab = "modules" | "pages" | "import";

export default function AdminPage() {
  const { data: modulesRaw } = useModules();
  const modules = modulesRaw as DocModuleWithParent[] | undefined;
  const { data: allPages } = useAllPages();
  const upsertModule = useUpsertModule();
  const upsertPage = useUpsertPage();
  const deleteModule = useDeleteModule();
  const deletePage = useDeletePage();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("modules");
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<DocModuleWithParent>>({});
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");

  const [pageEditor, setPageEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<DocPage & { tags: string[] }>>({});
  const [loadingAutoTag, setLoadingAutoTag] = useState(false);

  const [importModuleId, setImportModuleId] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importTags, setImportTags] = useState<string[]>([]);
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("anthropic_key") ?? "");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  // Árvore de módulos
  const rootModules = useMemo(() => modules?.filter((m) => !m.parent_module_id) ?? [], [modules]);
  const subModulesOf = (parentId: string) => modules?.filter((m) => m.parent_module_id === parentId) ?? [];
  const toggleModuleExpand = (id: string) => setExpandedModules((p) => ({ ...p, [id]: !p[id] }));

  // Todos os módulos em ordem flat para selects (com prefixo de nível)
  const allModulesFlat = useMemo(() => {
    const result: { mod: DocModuleWithParent; label: string }[] = [];
    const walk = (parentId: string | null, prefix: string) => {
      const group = modules?.filter((m) => (m.parent_module_id ?? null) === parentId) ?? [];
      group.forEach((m) => {
        result.push({ mod: m, label: `${prefix}${m.title}` });
        walk(m.id, `${prefix}  `);
      });
    };
    walk(null, "");
    return result;
  }, [modules]);

  // ── Auto-tag ────────────────────────────────────────────────────────────

  const generateTags = async (title: string, content: string): Promise<string[]> => {
    if (!anthropicKey) return [];
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 200,
          messages: [{ role: "user", content: `Analise este conteúdo de documentação ERP/PDV e retorne 3-8 tags relevantes.\n\nREGRAS: português, minúsculas, sem acentos, hífen para palavras compostas. Ex: "nota-fiscal", "pdv", "entrada-estoque".\n\nRetorne APENAS JSON array. Ex: ["nota-fiscal","pdv"]\n\nTítulo: ${title}\nConteúdo: ${content.slice(0, 3000)}` }],
        }),
      });
      const data = await res.json();
      const text = (data.content?.[0]?.text ?? "[]").replace(/```json?|```/g, "").trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((t: any) => String(t).toLowerCase().trim()).filter(Boolean);
    } catch { }
    return [];
  };

  const handleAutoTagEditor = async () => {
    setLoadingAutoTag(true);
    try {
      const tags = await generateTags(editingPage.title || "", editingPage.content || "");
      if (tags.length) {
        setEditingPage((p) => ({ ...p, tags: [...new Set([...(p.tags || []), ...tags])] }));
        toast({ title: `✅ ${tags.length} tags geradas!` });
      } else {
        toast({ title: "Sem API key", description: "Preencha a Chave da API Anthropic na aba Importar.", variant: "destructive" });
      }
    } finally { setLoadingAutoTag(false); }
  };

  // ── Loaders CDN ──────────────────────────────────────────────────────────

  const loadPdfJs = (): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) return resolve((window as any).pdfjsLib);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => { const lib = (window as any).pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; resolve(lib); };
    s.onerror = reject; document.head.appendChild(s);
  });

  const loadJSZip = (): Promise<any> => new Promise((resolve, reject) => {
    if ((window as any).JSZip) return resolve((window as any).JSZip);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve((window as any).JSZip); s.onerror = reject; document.head.appendChild(s);
  });

  // ── Upload helpers ───────────────────────────────────────────────────────

  const uploadBlob = async (blob: Blob, ext: string): Promise<string> => {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("docs-images").upload(path, blob, { upsert: false, contentType: blob.type || MIME_MAP[ext] || "image/png" });
    if (error) throw error;
    return supabase.storage.from("docs-images").getPublicUrl(path).data.publicUrl;
  };

  const uploadBase64 = async (dataUrl: string): Promise<string> => {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1].replace("jpeg", "jpg") ?? "png";
    return uploadBlob(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: mime }), ext);
  };

  const processInlineBase64 = async (md: string): Promise<string> => {
    const matches = [...md.matchAll(/!\[([^\]]*)\]\((data:image\/[^)]+)\)/g)];
    if (!matches.length) return md;
    let result = md;
    for (let i = 0; i < matches.length; i++) {
      const [full, alt, dataUrl] = matches[i];
      setImportProgress(`Enviando imagem inline ${i + 1}/${matches.length}...`);
      try { result = result.replace(full, `![${alt}](${await uploadBase64(dataUrl)})`); } catch { }
    }
    return result;
  };

  const replaceRelativeImages = (md: string, mdFullPath: string, imageMap: Map<string, string>): string => {
    const mdDir = mdFullPath.includes("/") ? mdFullPath.substring(0, mdFullPath.lastIndexOf("/")) : "";
    return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (/^(https?:|data:)/i.test(src)) return match;
      const decoded = (() => { try { return decodeURIComponent(src); } catch { return src; } })();
      for (const c of [mdDir ? `${mdDir}/${decoded}` : decoded, decoded, decoded.split("/").pop()!, src]) {
        const url = imageMap.get(c); if (url) return `![${alt}](${url})`;
      }
      return match;
    });
  };

  // ── ZIP helpers ──────────────────────────────────────────────────────────

  interface ZipMdFile { name: string; fullPath: string; content: string }
  interface ZipImgFile { fullPath: string; blob: Blob; ext: string }

  const collectZipFiles = async (JSZip: any, data: ArrayBuffer, pp = ""): Promise<{ mdFiles: ZipMdFile[]; imgFiles: ZipImgFile[] }> => {
    const zip = await JSZip.loadAsync(data);
    const mdFiles: ZipMdFile[] = []; const imgFiles: ZipImgFile[] = [];
    for (const [filename, fe] of Object.entries(zip.files) as [string, any][]) {
      if (fe.dir) continue;
      const fp = pp ? `${pp}/${filename}` : filename; const lower = filename.toLowerCase();
      if (lower.endsWith(".zip")) { const r = await collectZipFiles(JSZip, await fe.async("arraybuffer"), fp); mdFiles.push(...r.mdFiles); imgFiles.push(...r.imgFiles); }
      else if (lower.endsWith(".md")) { mdFiles.push({ name: filename.split("/").pop()!.replace(/\.md$/i, ""), fullPath: fp, content: await fe.async("string") }); }
      else if (IMAGE_EXTS.test(lower)) { const ext = lower.split(".").pop()!.replace("jpeg", "jpg"); imgFiles.push({ fullPath: fp, blob: new Blob([await fe.async("arraybuffer")], { type: MIME_MAP[ext] ?? "image/png" }), ext }); }
    }
    return { mdFiles, imgFiles };
  };

  const processZip = async (file: File): Promise<{ mdFiles: ZipMdFile[]; imageCount: number }> => {
    const JSZip = await loadJSZip();
    setImportProgress("Extraindo arquivos do ZIP...");
    const { mdFiles, imgFiles } = await collectZipFiles(JSZip, await file.arrayBuffer());
    if (mdFiles.length === 0) throw new Error("Nenhum arquivo .md encontrado no ZIP.");
    const imageMap = new Map<string, string>();
    for (let i = 0; i < imgFiles.length; i++) {
      const img = imgFiles[i];
      setImportProgress(`Enviando imagem ${i + 1}/${imgFiles.length}: ${img.fullPath.split("/").pop()}...`);
      try { const url = await uploadBlob(img.blob, img.ext); imageMap.set(img.fullPath, url); imageMap.set(img.fullPath.split("/").pop()!, url); } catch { }
    }
    const processed: ZipMdFile[] = [];
    for (let i = 0; i < mdFiles.length; i++) {
      const f = mdFiles[i]; setImportProgress(`Processando ${i + 1}/${mdFiles.length}: ${f.name}...`);
      let content = replaceRelativeImages(f.content, f.fullPath, imageMap);
      content = await processInlineBase64(content);
      processed.push({ ...f, content });
    }
    return { mdFiles: processed, imageCount: imgFiles.length };
  };

  // ── PDF helpers ──────────────────────────────────────────────────────────

  const extractPageEmbeddedImages = async (page: any): Promise<string[]> => {
    const pdfjsLib = (window as any).pdfjsLib; const ops = await page.getOperatorList(); const urls: string[] = []; const seen = new Set<string>();
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== pdfjsLib.OPS.paintImageXObject) continue;
      const name: string = ops.argsArray[i][0]; if (seen.has(name)) continue; seen.add(name);
      try {
        const imgData: any = await new Promise((res) => page.objs.get(name, res)); if (!imgData?.data) continue;
        const canvas = document.createElement("canvas"); canvas.width = imgData.width; canvas.height = imgData.height;
        const ctx = canvas.getContext("2d")!; const rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4); const src = imgData.data;
        if (src.length === imgData.width * imgData.height * 4) { rgba.set(src); }
        else { for (let p = 0; p < imgData.width * imgData.height; p++) { rgba[p*4]=src[p*3]; rgba[p*4+1]=src[p*3+1]; rgba[p*4+2]=src[p*3+2]; rgba[p*4+3]=255; } }
        ctx.putImageData(new ImageData(rgba, imgData.width, imgData.height), 0, 0);
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
        urls.push(await uploadBlob(blob, "jpg"));
      } catch { }
    }
    return urls;
  };

  const renderPageToBase64 = async (page: any): Promise<string> => {
    const viewport = page.getViewport({ scale: 2 }); const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    return new Promise<string>((res) => { canvas.toBlob((b) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.readAsDataURL(b!); }, "image/jpeg", 0.92); });
  };

  const pageToMarkdown = async (base64: string, imageUrls: string[]): Promise<string> => {
    if (!anthropicKey) throw new Error("Chave da API Anthropic não configurada.");
    const imgList = imageUrls.length > 0 ? `\n\nImagens (NA ORDEM):\n${imageUrls.map((u, i) => `${i + 1}: ${u}`).join("\n")}` : "";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } }, { type: "text", text: `Converta para Markdown GFM. H1→# H2→## H3→### Negrito→** Itálico→* Callout→> 🔔 ** Preserve emojis.${imgList}\n${imageUrls.length > 0 ? "Insira ![desc](URL) na ordem." : "Sem imagens."}\nRetorne APENAS markdown.` }] }] }),
    });
    const data = await res.json(); if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text ?? "";
  };

  const extractPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await loadPdfJs(); const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); setImportProgress(`Página ${i}/${pdf.numPages} — extraindo imagens...`);
      const imageUrls = await extractPageEmbeddedImages(page); setImportProgress(`Página ${i}/${pdf.numPages} — convertendo com IA...`);
      let md = ""; try { md = await pageToMarkdown(await renderPageToBase64(page), imageUrls); } catch { const tc = await page.getTextContent(); md = (tc.items as any[]).map((it: any) => it.str).join(" ").trim(); }
      if (md.trim()) parts.push(md.trim());
    }
    return parts.join("\n\n").replace(/\n{4,}/g, "\n\n").trim();
  };

  // ── Handler de upload ────────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const baseName = file.name.replace(/\.(md|html?|pdf|zip)$/i, "");
    if (!importTitle) setImportTitle(baseName);
    setImporting(true); setImportProgress("Lendo arquivo...");
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".zip")) {
        const { mdFiles, imageCount } = await processZip(file);
        if (mdFiles.length === 1) {
          setImportContent(sanitizeContent(mdFiles[0].content)); if (!importTitle) setImportTitle(mdFiles[0].name);
          setImportProgress("Gerando tags com IA...");
          const tags = await generateTags(mdFiles[0].name, mdFiles[0].content); setImportTags(tags);
          toast({ title: "✅ ZIP importado!", description: `1 página · ${imageCount} imagem(ns) · ${tags.length} tags.` });
        } else if (!importModuleId) {
          setImportContent(sanitizeContent(mdFiles[0].content)); setImportTitle(mdFiles[0].name);
          toast({ title: `${mdFiles.length} arquivos encontrados`, description: "Selecione um módulo e reimporte.", variant: "destructive" });
        } else {
          for (let i = 0; i < mdFiles.length; i++) {
            const f = mdFiles[i]; setImportProgress(`Tagueando e salvando ${i + 1}/${mdFiles.length}: ${f.name}...`);
            const tags = await generateTags(f.name, f.content);
            const mp = allPages?.filter((p) => p.module_id === importModuleId) || [];
            await upsertPage.mutateAsync({ title: f.name, slug: `${slugify(f.name)}-${Date.now() + i}`, module_id: importModuleId, content: sanitizeContent(f.content), tags, order_index: mp.length + i });
          }
          toast({ title: `✅ ${mdFiles.length} páginas importadas!` });
        }
      } else if (lower.endsWith(".pdf")) {
        const markdown = await extractPdf(file); setImportContent(sanitizeContent(markdown));
        setImportProgress("Gerando tags com IA..."); const tags = await generateTags(baseName, markdown); setImportTags(tags);
        toast({ title: "✅ PDF importado!", description: `${(markdown.match(/!\[/g) || []).length} imagem(ns) · ${tags.length} tags.` });
      } else {
        const text: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = (ev) => res(ev.target?.result as string); r.onerror = rej; r.readAsText(file); });
        setImportProgress("Processando imagens..."); const processed = await processInlineBase64(text); setImportContent(processed);
        setImportProgress("Gerando tags com IA..."); const tags = await generateTags(baseName, processed); setImportTags(tags);
        toast({ title: "✅ Arquivo importado!", description: `${tags.length} tags geradas.` });
      }
    } catch (err: any) { toast({ title: "Erro na importação", description: err.message, variant: "destructive" }); }
    finally { setImporting(false); setImportProgress(""); if (e.target) e.target.value = ""; }
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSaveModule = async () => {
    if (!editingModule.title) return;
    try {
      await upsertModule.mutateAsync({
        ...editingModule,
        slug: editingModule.slug || slugify(editingModule.title),
        title: editingModule.title,
        parent_module_id: editingModule.parent_module_id ?? null,
        order_index: editingModule.order_index ?? (modules?.length ?? 0),
      } as any);
      setModuleDialog(false); setEditingModule({});
      toast({ title: "✅ Módulo salvo!" });
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleSavePage = async () => {
    if (!editingPage.title || !editingPage.module_id) return;
    try {
      const mp = allPages?.filter((p) => p.module_id === editingPage.module_id) || [];
      await upsertPage.mutateAsync({ ...editingPage, slug: editingPage.slug || slugify(editingPage.title), title: editingPage.title, module_id: editingPage.module_id, content: sanitizeContent(editingPage.content || ""), tags: editingPage.tags || [], order_index: editingPage.order_index ?? mp.length });
      setPageEditor(false); setEditingPage({}); toast({ title: "✅ Página salva!" });
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const handleImport = async () => {
    if (!importTitle || !importModuleId || !importContent) return;
    try {
      const mp = allPages?.filter((p) => p.module_id === importModuleId) || [];
      await upsertPage.mutateAsync({ title: importTitle, slug: `${slugify(importTitle)}-${Date.now()}`, module_id: importModuleId, content: sanitizeContent(importContent), tags: importTags, order_index: mp.length });
      setImportContent(""); setImportTitle(""); setImportModuleId(""); setImportTags([]);
      toast({ title: "✅ Página importada!" });
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
  };

  const openNewPage = () => { setEditingPage({ tags: [] }); setPageEditor(true); };
  const openEditPage = (page: DocPage) => { setEditingPage({ ...page, tags: (page as any).tags || [] }); setPageEditor(true); };

  const filteredPages = allPages?.filter((p) => selectedModuleFilter === "all" || p.module_id === selectedModuleFilter);
  const getModuleName = (id: string) => modules?.find((m) => m.id === id)?.title || "—";
  const getModuleSlug = (id: string) => modules?.find((m) => m.id === id)?.slug || "";

  const sidebarTabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "modules", label: "Módulos", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "pages", label: "Páginas", icon: <FileText className="h-4 w-4" /> },
    { key: "import", label: "Importar", icon: <Upload className="h-4 w-4" /> },
  ];

  // ── Editor de página ─────────────────────────────────────────────────────

  if (pageEditor) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="h-14 border-b border-border flex items-center px-6 gap-4 sticky top-0 bg-background z-10">
          <button onClick={() => { setPageEditor(false); setEditingPage({}); }} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"><X className="h-4 w-4" /></button>
          <span className="text-sm font-medium text-foreground flex-1 truncate">{editingPage.id ? `Editando: ${editingPage.title}` : "Nova página"}</span>
          <Button size="sm" onClick={handleSavePage} disabled={!editingPage.title || !editingPage.module_id}>Salvar página</Button>
        </div>
        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-8 py-6 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Título *</label>
              <Input placeholder="Ex: Configuração inicial" value={editingPage.title || ""} onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Módulo *</label>
              <Select value={editingPage.module_id || ""} onValueChange={(v) => setEditingPage({ ...editingPage, module_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                <SelectContent>{allModulesFlat.map(({ mod, label }) => <SelectItem key={mod.id} value={mod.id}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Página pai</label>
              <Select value={editingPage.parent_page_id || "none"} onValueChange={(v) => setEditingPage({ ...editingPage, parent_page_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {allPages?.filter((p) => p.module_id === editingPage.module_id && p.id !== editingPage.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Slug <span className="text-muted-foreground font-normal text-xs">(auto-gerado)</span></label>
              <Input placeholder="configuracao-inicial" value={editingPage.slug || ""} onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags <span className="text-muted-foreground font-normal text-xs">(para treinamento de IA)</span></label>
            <TagInput tags={editingPage.tags || []} onChange={(tags) => setEditingPage({ ...editingPage, tags })} onAutoTag={handleAutoTagEditor} loadingAutoTag={loadingAutoTag} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Conteúdo</label>
            <MarkdownEditor value={editingPage.content || ""} onChange={(v) => setEditingPage({ ...editingPage, content: v })} minRows={28} />
          </div>
        </div>
      </div>
    );
  }

  // ── Layout principal ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-[220px] border-r border-border bg-muted/30 flex flex-col min-h-screen">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-foreground font-bold"><BookOpen className="h-5 w-5 text-primary" /><span>Docs Admin</span></Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {sidebarTabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <Link to="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"><Eye className="h-4 w-4" />Ver documentação</Link>
          <div className="px-3 py-1"><p className="text-xs text-muted-foreground truncate">{user?.email}</p></div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sair</Button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">

        {/* ── MÓDULOS ── */}
        {tab === "modules" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
                <p className="text-sm text-muted-foreground mt-1">Organize sua documentação em módulos e submódulos</p>
              </div>
              <Dialog open={moduleDialog} onOpenChange={(o) => { setModuleDialog(o); if (!o) setEditingModule({}); }}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo Módulo</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingModule.id ? "Editar" : "Novo"} Módulo</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Título *</label>
                      <Input placeholder="Ex: Integração com PDV" value={editingModule.title || ""} onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Descrição</label>
                      <Input placeholder="Breve descrição" value={editingModule.description || ""} onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Módulo pai <span className="text-muted-foreground font-normal">(deixe vazio para raiz)</span></label>
                      <Select
                        value={editingModule.parent_module_id || "none"}
                        onValueChange={(v) => setEditingModule({ ...editingModule, parent_module_id: v === "none" ? null : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Nenhum (módulo raiz)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Nenhum (módulo raiz)</SelectItem>
                          {allModulesFlat
                            .filter(({ mod }) => mod.id !== editingModule.id)
                            .map(({ mod, label }) => <SelectItem key={mod.id} value={mod.id}>{label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Slug <span className="text-muted-foreground font-normal">(auto-gerado se vazio)</span></label>
                      <Input placeholder="integracao-pdv" value={editingModule.slug || ""} onChange={(e) => setEditingModule({ ...editingModule, slug: e.target.value })} />
                    </div>
                    <Button onClick={handleSaveModule} className="w-full" disabled={!editingModule.title}>Salvar Módulo</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Árvore de módulos */}
            {rootModules.length > 0 ? (
              <div className="space-y-1">
                {rootModules.map((mod) => (
                  <ModuleTreeItem
                    key={mod.id}
                    mod={mod}
                    subModules={subModulesOf(mod.id)}
                    subModulesOf={subModulesOf}
                    expanded={expandedModules}
                    toggle={toggleModuleExpand}
                    onEdit={(m) => { setEditingModule(m); setModuleDialog(true); }}
                    onDelete={(m) => { if (confirm(`Excluir "${m.title}"? Isso também excluirá os submódulos.`)) deleteModule.mutate(m.id); }}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum módulo criado ainda</p>
              </div>
            )}
          </div>
        )}

        {/* ── PÁGINAS ── */}
        {tab === "pages" && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Páginas</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie o conteúdo de cada módulo</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedModuleFilter} onValueChange={setSelectedModuleFilter}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filtrar por módulo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os módulos</SelectItem>
                    {allModulesFlat.map(({ mod, label }) => <SelectItem key={mod.id} value={mod.id}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={openNewPage}><Plus className="h-4 w-4 mr-1" /> Nova Página</Button>
              </div>
            </div>
            {filteredPages && filteredPages.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulo</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm text-foreground">{page.title}</span>
                            {page.parent_page_id && <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">sub</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">{getModuleName(page.module_id)}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {((page as any).tags || []).slice(0, 4).map((tag: string) => (
                              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                <Tag className="h-2.5 w-2.5" />{tag}
                              </span>
                            ))}
                            {((page as any).tags || []).length > 4 && <span className="text-[10px] text-muted-foreground">+{(page as any).tags.length - 4}</span>}
                            {(!(page as any).tags || (page as any).tags.length === 0) && <span className="text-[10px] text-muted-foreground/50 italic">sem tags</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEditPage(page)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir "${page.title}"?`)) deletePage.mutate(page.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma página encontrada</p>
              </div>
            )}
          </div>
        )}

        {/* ── IMPORTAR ── */}
        {tab === "import" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Importar conteúdo</h1>
              <p className="text-sm text-muted-foreground mt-1">Imagens e tags geradas automaticamente em qualquer formato.</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary mb-2">✦ Importação recomendada: Notion → ZIP</p>
              <p className="text-sm text-muted-foreground mb-3">Exporte como <strong className="text-foreground">Markdown &amp; CSV</strong> e importe o <code className="text-xs bg-muted px-1 py-0.5 rounded">.zip</code> — imagens e tags geradas automaticamente.</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Notion → ··· → Export → <strong className="text-foreground">Markdown &amp; CSV</strong></li>
                <li>Selecione o módulo abaixo e importe o <code className="text-xs bg-muted px-1 py-0.5 rounded">.zip</code></li>
              </ol>
            </div>
            <div className="rounded-lg border border-border p-5">
              <p className="text-sm font-semibold text-foreground mb-1">🔑 Chave da API Anthropic <span className="font-normal text-muted-foreground">(PDF + auto-tag)</span></p>
              <p className="text-xs text-muted-foreground mb-3">Usada localmente. Não salva no servidor.</p>
              <Input type="password" placeholder="sk-ant-..." value={anthropicKey} onChange={(e) => { setAnthropicKey(e.target.value); localStorage.setItem("anthropic_key", e.target.value); }} />
            </div>
            <div className="space-y-5 border border-border rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Título da página *</label>
                  <Input placeholder="Ex: Guia de instalação" value={importTitle} onChange={(e) => setImportTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Módulo *</label>
                  <Select value={importModuleId} onValueChange={setImportModuleId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                    <SelectContent>{allModulesFlat.map(({ mod, label }) => <SelectItem key={mod.id} value={mod.id}>{label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Arquivo</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/30 transition-colors">
                  {importing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">{importProgress || "Processando..."}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">Clique para selecionar</p>
                      <p className="text-xs text-muted-foreground/60 mb-3">.zip · .md · .html · .pdf — imagens e tags automáticas</p>
                      <input type="file" accept=".md,.html,.htm,.pdf,.zip" onChange={handleFileUpload}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer" />
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Tags <span className="text-muted-foreground font-normal text-xs">(geradas pela IA, edite se quiser)</span></label>
                <TagInput tags={importTags} onChange={setImportTags} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Conteúdo</label>
                <MarkdownEditor value={importContent} onChange={setImportContent} minRows={16} />
              </div>
              <Button onClick={handleImport} className="w-full" disabled={!importTitle || !importModuleId || !importContent}>
                <Upload className="h-4 w-4 mr-2" />Importar Página
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Item da árvore de módulos (recursivo) ─────────────────────────────────────

function ModuleTreeItem({
  mod, subModules, subModulesOf, expanded, toggle, onEdit, onDelete, depth,
}: {
  mod: DocModule & { parent_module_id?: string | null };
  subModules: (DocModule & { parent_module_id?: string | null })[];
  subModulesOf: (id: string) => (DocModule & { parent_module_id?: string | null })[];
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  onEdit: (m: DocModule) => void;
  onDelete: (m: DocModule) => void;
  depth: number;
}) {
  const isExpanded = expanded[mod.id] ?? true;
  const hasChildren = subModules.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border/40 pl-3" : ""}>
      <div className="border border-border rounded-lg p-3 flex items-center gap-3 bg-background hover:bg-muted/10 transition-colors mb-1">
        {hasChildren ? (
          <button onClick={() => toggle(mod.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm">{mod.title}</p>
            {depth > 0 && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">submódulo</span>}
          </div>
          {mod.description && <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>}
          <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">/{mod.slug}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(mod)}><Edit className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(mod)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="mb-2 space-y-1">
          {subModules.map((sub) => (
            <ModuleTreeItem
              key={sub.id}
              mod={sub}
              subModules={subModulesOf(sub.id)}
              subModulesOf={subModulesOf}
              expanded={expanded}
              toggle={toggle}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
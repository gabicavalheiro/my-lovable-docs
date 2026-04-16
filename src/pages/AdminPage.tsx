import { useState } from "react";
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
  FolderOpen, Eye, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

/** Remove sequências Unicode inválidas que o PostgreSQL rejeita */
function sanitizeContent(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")   // controles
    .replace(/\uD800|\uDBFF|\uDC00|\uDFFF/g, "")           // surrogates isolados
    .replace(/[\uFFFD\uFFFE\uFFFF]/g, "")                  // noncharacters
    .replace(/\\u[0-9a-fA-F]{4}/g, (m) => {               // \uXXXX literal no texto
      try { return JSON.parse(`"${m}"`); } catch { return ""; }
    });
}

type Tab = "modules" | "pages" | "import";

export default function AdminPage() {
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();
  const upsertModule = useUpsertModule();
  const upsertPage = useUpsertPage();
  const deleteModule = useDeleteModule();
  const deletePage = useDeletePage();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("modules");
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<DocModule>>({});
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");

  // Editor de página — tela cheia
  const [pageEditor, setPageEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<Partial<DocPage>>({});

  // Import
  const [importModuleId, setImportModuleId] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("anthropic_key") ?? "");

  const openNewPage = () => {
    setEditingPage({});
    setPageEditor(true);
  };

  const openEditPage = (page: DocPage) => {
    setEditingPage({ ...page });
    setPageEditor(true);
  };

  const handleSaveModule = async () => {
    if (!editingModule.title) return;
    try {
      await upsertModule.mutateAsync({
        ...editingModule,
        slug: editingModule.slug || slugify(editingModule.title),
        title: editingModule.title,
        order_index: editingModule.order_index ?? (modules?.length ?? 0),
      });
      setModuleDialog(false);
      setEditingModule({});
      toast({ title: "✅ Módulo salvo!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleSavePage = async () => {
    if (!editingPage.title || !editingPage.module_id) return;
    try {
      const modulePages = allPages?.filter((p) => p.module_id === editingPage.module_id) || [];
      await upsertPage.mutateAsync({
        ...editingPage,
        slug: editingPage.slug || slugify(editingPage.title),
        title: editingPage.title,
        module_id: editingPage.module_id,
        content: sanitizeContent(editingPage.content || ""),
        order_index: editingPage.order_index ?? modulePages.length,
      });
      setPageEditor(false);
      setEditingPage({});
      toast({ title: "✅ Página salva!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importTitle || !importModuleId || !importContent) return;
    try {
      const modulePages = allPages?.filter((p) => p.module_id === importModuleId) || [];
      const baseSlug = slugify(importTitle);
      await upsertPage.mutateAsync({
        title: importTitle,
        slug: `${baseSlug}-${Date.now()}`,
        module_id: importModuleId,
        content: sanitizeContent(importContent),
        order_index: modulePages.length,
      });
      setImportContent("");
      setImportTitle("");
      setImportModuleId("");
      toast({ title: "✅ Página importada!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  // ── Carrega PDF.js via CDN ──
  const loadPdfJs = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).pdfjsLib) return resolve((window as any).pdfjsLib);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(lib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // ── Faz upload de um Blob para o Supabase Storage ──
  const uploadImageBlob = async (blob: Blob, ext = "jpg"): Promise<string> => {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("docs-images")
      .upload(path, blob, { upsert: false, contentType: blob.type });
    if (error) throw error;
    const { data } = supabase.storage.from("docs-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Faz upload de imagem base64 (data:image/...) ──
  const uploadBase64Image = async (dataUrl: string): Promise<string> => {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return uploadImageBlob(blob, ext);
  };

  // ── Extrai as imagens XObject embutidas em uma página do PDF ──
  const extractPageEmbeddedImages = async (page: any): Promise<string[]> => {
    const pdfjsLib = (window as any).pdfjsLib;
    const ops = await page.getOperatorList();
    const urls: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== pdfjsLib.OPS.paintImageXObject) continue;
      const name: string = ops.argsArray[i][0];
      if (seen.has(name)) continue;
      seen.add(name);

      try {
        const imgData: any = await new Promise((resolve) =>
          page.objs.get(name, resolve)
        );
        if (!imgData?.data) continue;

        // Converte ImageData para canvas → Blob → upload
        const canvas = document.createElement("canvas");
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext("2d")!;

        // imgData.data pode ser Uint8ClampedArray (RGBA) ou Uint8Array
        let rgba: Uint8ClampedArray;
        if (imgData.data.length === imgData.width * imgData.height * 4) {
          rgba = new Uint8ClampedArray(imgData.data);
        } else {
          // RGB sem alpha — adiciona canal alpha
          rgba = new Uint8ClampedArray(imgData.width * imgData.height * 4);
          for (let p = 0; p < imgData.width * imgData.height; p++) {
            rgba[p * 4]     = imgData.data[p * 3];
            rgba[p * 4 + 1] = imgData.data[p * 3 + 1];
            rgba[p * 4 + 2] = imgData.data[p * 3 + 2];
            rgba[p * 4 + 3] = 255;
          }
        }

        ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer instanceof SharedArrayBuffer ? rgba.slice().buffer : rgba.buffer, rgba.byteOffset, rgba.byteLength), imgData.width, imgData.height), 0, 0);
        const blob: Blob = await new Promise((res) =>
          canvas.toBlob(res as any, "image/jpeg", 0.9)
        );
        const url = await uploadImageBlob(blob, "jpg");
        urls.push(url);
      } catch {
        // imagem não extraível — ignora
      }
    }
    return urls;
  };

  // ── Renderiza página como JPEG base64 para enviar ao Claude ──
  const renderPageToBase64 = async (page: any, scale = 2.0): Promise<string> => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res) => canvas.toBlob(res as any, "image/jpeg", 0.92));
    return new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(",")[1]);
      reader.readAsDataURL(blob);
    });
  };

  // ── Envia página ao Claude com URLs das imagens já resolvidas ──
  const pageToMarkdown = async (base64: string, imageUrls: string[]): Promise<string> => {
    if (!anthropicKey) throw new Error("Chave da API Anthropic não configurada. Preencha o campo acima.");
    const imgList = imageUrls.length > 0
      ? `\n\nAs imagens embutidas nesta página já foram extraídas e têm as seguintes URLs (use-as NA ORDEM em que aparecem na página):\n${imageUrls.map((u, i) => `Imagem ${i + 1}: ${u}`).join("\n")}`
      : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            {
              type: "text",
              text: `Você é um conversor de PDF Notion → Markdown. Converta esta página para markdown GFM.

REGRAS DE FORMATAÇÃO:
- Título H1 grande → # Título
- Título H2 → ## Título  
- Título H3 → ### Título
- Negrito → **texto**
- Itálico → *texto*
- Listas com bullet → - item (preserve sub-níveis com indentação de 2 espaços)
- Listas numeradas → 1. item
- Callout do Notion (caixa colorida com ícone) → > 🔔 **Texto do callout**  (use o ícone real da caixa)
- Separador horizontal → ---
- Código inline → \`código\`
- Preserve todos os emojis exatamente
- NÃO inclua rodapés/cabeçalhos de paginação (ex: "Nome do doc - página N")${imgList}

PARA IMAGENS:
${imageUrls.length > 0
  ? "- Onde houver uma captura de tela ou imagem na página, insira ![descrição breve](URL_CORRESPONDENTE) usando as URLs fornecidas acima na ordem que aparecem"
  : "- Esta página não tem imagens embutidas extraídas — não invente URLs"}

Retorne APENAS o markdown, sem bloco de código, sem explicações.`,
            },
          ],
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.content?.[0]?.text ?? "";
  };

  // ── Pipeline principal: PDF → por página → Claude → markdown final ──
  const extractPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const parts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      setImportProgress(`Página ${i}/${pdf.numPages} — extraindo imagens...`);
      const page = await pdf.getPage(i);

      // 1. Extrai imagens embutidas e faz upload
      const imageUrls = await extractPageEmbeddedImages(page);

      // 2. Renderiza página para visão do Claude
      setImportProgress(`Página ${i}/${pdf.numPages} — convertendo com IA...`);
      const base64 = await renderPageToBase64(page);

      // 3. Claude converte página para markdown com imagens mapeadas
      let markdown = "";
      try {
        markdown = await pageToMarkdown(base64, imageUrls);
      } catch (err: any) {
        // Fallback mínimo se API falhar
        const tc = await page.getTextContent();
        markdown = (tc.items as any[]).map((it: any) => it.str).join(" ").trim();
      }

      if (markdown.trim()) parts.push(markdown.trim());
    }

    return parts.join("\n\n").replace(/\n{4,}/g, "\n\n").trim();
  };

  // ── Processa Markdown: faz upload de imagens base64 e mantém URLs externas ──
  const processMarkdownImages = async (md: string): Promise<string> => {
    const base64Regex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
    const matches = [...md.matchAll(base64Regex)];
    if (matches.length === 0) return md;

    let result = md;
    for (let i = 0; i < matches.length; i++) {
      setImportProgress(`Enviando imagem ${i + 1} de ${matches.length}...`);
      const [full, alt, dataUrl] = matches[i];
      try {
        const url = await uploadBase64Image(dataUrl);
        result = result.replace(full, `![${alt}](${url})`);
      } catch {
        // mantém a imagem original se o upload falhar
      }
    }
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.(md|html?|pdf)$/i, "");
    if (!importTitle) setImportTitle(name);
    setImporting(true);
    setImportProgress("Lendo arquivo...");

    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const markdown = await extractPdf(file);
        setImportContent(sanitizeContent(markdown));
        const imgCount = (markdown.match(/!\[/g) || []).length;
        toast({
          title: "✅ PDF importado!",
          description: imgCount > 0
            ? `Texto extraído com ${imgCount} imagem(ns) enviada(s) para o storage.`
            : "Texto extraído com sucesso.",
        });
      } else {
        // Markdown / HTML
        const text: string = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target?.result as string);
          reader.onerror = rej;
          reader.readAsText(file);
        });
        setImportProgress("Processando imagens...");
        const processed = await processMarkdownImages(text);
        setImportContent(processed);
        const imgCount = (processed.match(/!\[/g) || []).length;
        toast({
          title: "✅ Arquivo importado!",
          description: imgCount > 0
            ? `${imgCount} imagem(ns) processada(s).`
            : "Conteúdo importado com sucesso.",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      setImportProgress("");
      if (e.target) e.target.value = "";
    }
  };

  const filteredPages = allPages?.filter(
    (p) => selectedModuleFilter === "all" || p.module_id === selectedModuleFilter
  );

  const getModuleName = (moduleId: string) =>
    modules?.find((m) => m.id === moduleId)?.title || "—";

  const getModuleSlug = (moduleId: string) =>
    modules?.find((m) => m.id === moduleId)?.slug || "";

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "modules", label: "Módulos", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "pages", label: "Páginas", icon: <FileText className="h-4 w-4" /> },
    { key: "import", label: "Importar", icon: <Upload className="h-4 w-4" /> },
  ];

  // ── Editor de página em tela cheia ──────────────────────────────────────
  if (pageEditor) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Barra superior do editor */}
        <div className="h-14 border-b border-border flex items-center px-6 gap-4 sticky top-0 bg-background z-10">
          <button
            onClick={() => { setPageEditor(false); setEditingPage({}); }}
            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground flex-1 truncate">
            {editingPage.id ? `Editando: ${editingPage.title}` : "Nova página"}
          </span>
          <Button
            size="sm"
            onClick={handleSavePage}
            disabled={!editingPage.title || !editingPage.module_id}
          >
            Salvar página
          </Button>
        </div>

        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-8 py-6 gap-4">
          {/* Metadados */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Título *</label>
              <Input
                placeholder="Ex: Configuração inicial"
                value={editingPage.title || ""}
                onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Módulo *</label>
              <Select
                value={editingPage.module_id || ""}
                onValueChange={(v) => setEditingPage({ ...editingPage, module_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                <SelectContent>
                  {modules?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Página pai</label>
              <Select
                value={editingPage.parent_page_id || "none"}
                onValueChange={(v) => setEditingPage({ ...editingPage, parent_page_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                  {allPages
                    ?.filter((p) => p.module_id === editingPage.module_id && p.id !== editingPage.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Slug <span className="text-muted-foreground font-normal text-xs">(auto-gerado)</span>
              </label>
              <Input
                placeholder="configuracao-inicial"
                value={editingPage.slug || ""}
                onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
              />
            </div>
          </div>

          {/* Editor de conteúdo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Conteúdo</label>
            <MarkdownEditor
              value={editingPage.content || ""}
              onChange={(v) => setEditingPage({ ...editingPage, content: v })}
              minRows={28}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Layout principal ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-[220px] border-r border-border bg-muted/30 flex flex-col min-h-screen">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 text-foreground font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Docs Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Link
            to="/docs"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
          >
            <Eye className="h-4 w-4" />
            Ver documentação
          </Link>
          <div className="px-3 py-1">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 p-8 overflow-y-auto">

        {/* ── MÓDULOS ── */}
        {tab === "modules" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
                <p className="text-sm text-muted-foreground mt-1">Organize sua documentação em módulos temáticos</p>
              </div>
              <Dialog open={moduleDialog} onOpenChange={(o) => { setModuleDialog(o); if (!o) setEditingModule({}); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" /> Novo Módulo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingModule.id ? "Editar" : "Novo"} Módulo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Título *</label>
                      <Input
                        placeholder="Ex: Integração com PDV"
                        value={editingModule.title || ""}
                        onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Descrição</label>
                      <Input
                        placeholder="Breve descrição do módulo"
                        value={editingModule.description || ""}
                        onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Slug <span className="text-muted-foreground font-normal">(auto-gerado se vazio)</span>
                      </label>
                      <Input
                        placeholder="integracao-pdv"
                        value={editingModule.slug || ""}
                        onChange={(e) => setEditingModule({ ...editingModule, slug: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleSaveModule} className="w-full" disabled={!editingModule.title}>
                      Salvar Módulo
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {modules && modules.length > 0 ? (
              <div className="space-y-2">
                {modules.map((mod) => (
                  <div key={mod.id} className="border border-border rounded-lg p-4 flex items-center gap-4 group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{mod.title}</p>
                      {mod.description && <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1 font-mono">/{mod.slug}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingModule(mod); setModuleDialog(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir "${mod.title}"?`)) deleteModule.mutate(mod.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
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
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Páginas</h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie o conteúdo de cada módulo</p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedModuleFilter} onValueChange={setSelectedModuleFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os módulos</SelectItem>
                    {modules?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={openNewPage}>
                  <Plus className="h-4 w-4 mr-1" /> Nova Página
                </Button>
              </div>
            </div>

            {filteredPages && filteredPages.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulo</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPages.map((page) => (
                      <tr key={page.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm text-foreground">{page.title}</span>
                            {page.parent_page_id && (
                              <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">sub</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">{getModuleName(page.module_id)}</td>
                        <td className="px-5 py-3">
                          <Link to={`/docs/${getModuleSlug(page.module_id)}/${page.slug}`} className="text-xs text-primary hover:underline">
                            /docs/{getModuleSlug(page.module_id)}/{page.slug}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => openEditPage(page)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir "${page.title}"?`)) deletePage.mutate(page.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Importar conteúdo</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Importe páginas do Notion, arquivos Markdown, HTML ou PDF.
              </p>
            </div>

            {/* ── Guia Notion (recomendado) ── */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-primary mb-2">✦ Importação recomendada: Notion → Markdown</p>
              <p className="text-sm text-muted-foreground mb-3">
                Exportar do Notion como Markdown preserva 100% da formatação: headings, callouts, listas, negrito, quotes e imagens.
                PDFs perdem a estrutura no processo de geração.
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                <li>No Notion, abra a página → <strong className="text-foreground">···</strong> → <strong className="text-foreground">Export</strong></li>
                <li>Escolha <strong className="text-foreground">Markdown &amp; CSV</strong></li>
                <li>Extraia o <code className="text-xs bg-muted px-1 py-0.5 rounded">.zip</code> — cada página vira um arquivo <code className="text-xs bg-muted px-1 py-0.5 rounded">.md</code></li>
                <li>Importe o <code className="text-xs bg-muted px-1 py-0.5 rounded">.md</code> aqui abaixo</li>
              </ol>
            </div>

            {/* ── API Key (para PDF) ── */}
            <div className="rounded-lg border border-border p-5">
              <p className="text-sm font-semibold text-foreground mb-1">🔑 Chave da API Anthropic <span className="font-normal text-muted-foreground">(necessária apenas para importar PDF)</span></p>
              <p className="text-xs text-muted-foreground mb-3">Usada localmente para converter PDF → Markdown via IA. Não é salva no servidor.</p>
              <Input
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value);
                  localStorage.setItem("anthropic_key", e.target.value);
                }}
              />
            </div>

            {/* ── Formulário de importação ── */}
            <div className="space-y-5 border border-border rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Título da página *</label>
                  <Input
                    placeholder="Ex: Guia de instalação"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Módulo *</label>
                  <Select value={importModuleId} onValueChange={setImportModuleId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                    <SelectContent>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
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
                      <p className="text-xs text-muted-foreground/60 mb-3">Suporta .md, .html e .pdf</p>
                      <input
                        type="file"
                        accept=".md,.html,.htm,.pdf"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Conteúdo</label>
                <MarkdownEditor value={importContent} onChange={setImportContent} minRows={16} />
              </div>

              <Button
                onClick={handleImport}
                className="w-full"
                disabled={!importTitle || !importModuleId || !importContent}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Página
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
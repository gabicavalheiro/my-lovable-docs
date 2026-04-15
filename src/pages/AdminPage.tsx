import { useState } from "react";
import {
  useModules, useAllPages, useUpsertModule, useUpsertPage,
  useDeleteModule, useDeletePage, type DocModule, type DocPage,
} from "@/hooks/useDocData";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Edit, Upload, LogOut, BookOpen, FileText, FolderOpen,
  Eye, ChevronRight, GripVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

function slugify(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
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
  const [pageDialog, setPageDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<DocModule>>({});
  const [editingPage, setEditingPage] = useState<Partial<DocPage>>({});
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");

  // Import state
  const [importModuleId, setImportModuleId] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importTitle, setImportTitle] = useState("");

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
      toast({ title: "✅ Módulo salvo com sucesso!" });
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
        content: editingPage.content || "",
        order_index: editingPage.order_index ?? modulePages.length,
      });
      setPageDialog(false);
      setEditingPage({});
      toast({ title: "✅ Página salva com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importTitle || !importModuleId || !importContent) return;
    try {
      const modulePages = allPages?.filter((p) => p.module_id === importModuleId) || [];
      await upsertPage.mutateAsync({
        title: importTitle,
        slug: slugify(importTitle),
        module_id: importModuleId,
        content: importContent,
        order_index: modulePages.length,
      });
      setImportContent("");
      setImportTitle("");
      setImportModuleId("");
      toast({ title: "✅ Página importada com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportContent(ev.target?.result as string);
      if (!importTitle) setImportTitle(file.name.replace(/\.(md|html?)$/i, ""));
    };
    reader.readAsText(file);
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
          <Link to="/docs" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent">
            <Eye className="h-4 w-4" />
            Ver documentação
          </Link>
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* ========== MODULES TAB ========== */}
        {tab === "modules" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Módulos</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize sua documentação em módulos temáticos
                </p>
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
                {modules.map((mod) => {
                  const pageCount = allPages?.filter((p) => p.module_id === mod.id).length || 0;
                  return (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between border border-border rounded-lg px-5 py-4 hover:border-primary/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-secondary">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{mod.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">/{mod.slug}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{pageCount} página{pageCount !== 1 ? "s" : ""}</span>
                          </div>
                          {mod.description && (
                            <p className="text-xs text-muted-foreground mt-1">{mod.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingModule(mod); setModuleDialog(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm(`Excluir "${mod.title}" e todas as suas páginas?`)) deleteModule.mutate(mod.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-lg p-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum módulo criado ainda</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Crie seu primeiro módulo para começar</p>
              </div>
            )}
          </div>
        )}

        {/* ========== PAGES TAB ========== */}
        {tab === "pages" && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Páginas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie o conteúdo de cada módulo
                </p>
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
                <Dialog open={pageDialog} onOpenChange={(o) => { setPageDialog(o); if (!o) setEditingPage({}); }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-1" /> Nova Página</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingPage.id ? "Editar" : "Nova"} Página</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
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
                          Slug <span className="text-muted-foreground font-normal">(auto-gerado se vazio)</span>
                        </label>
                        <Input
                          placeholder="configuracao-inicial"
                          value={editingPage.slug || ""}
                          onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Conteúdo (Markdown)</label>
                        <Textarea
                          placeholder="# Título&#10;&#10;Escreva aqui em Markdown..."
                          value={editingPage.content || ""}
                          onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                          rows={16}
                          className="font-mono text-sm"
                        />
                      </div>
                      <Button onClick={handleSavePage} className="w-full" disabled={!editingPage.title || !editingPage.module_id}>
                        Salvar Página
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {getModuleName(page.module_id)}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            to={`/docs/${getModuleSlug(page.module_id)}/${page.slug}`}
                            className="text-xs text-primary hover:underline"
                          >
                            /docs/{getModuleSlug(page.module_id)}/{page.slug}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingPage(page); setPageDialog(true); }}>
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
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {modules && modules.length === 0
                    ? "Crie um módulo primeiro"
                    : "Crie sua primeira página"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========== IMPORT TAB ========== */}
        {tab === "import" && (
          <div className="max-w-xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Importar conteúdo</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Importe arquivos Markdown (.md) ou HTML (.html) como novas páginas
              </p>
            </div>

            <div className="space-y-5 border border-border rounded-lg p-6">
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
                  <SelectTrigger><SelectValue placeholder="Selecione o módulo de destino" /></SelectTrigger>
                  <SelectContent>
                    {modules?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Arquivo</label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Arraste ou clique para selecionar</p>
                  <input
                    type="file"
                    accept=".md,.html,.htm"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Ou cole o conteúdo diretamente
                </label>
                <Textarea
                  placeholder="# Título&#10;&#10;Cole seu markdown aqui..."
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
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

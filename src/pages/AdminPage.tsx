import { useState } from "react";
import { useModules, useAllPages, useUpsertModule, useUpsertPage, useDeleteModule, useDeletePage, type DocModule, type DocPage } from "@/hooks/useDocData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Upload, ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AdminPage() {
  const { data: modules } = useModules();
  const { data: allPages } = useAllPages();
  const upsertModule = useUpsertModule();
  const upsertPage = useUpsertPage();
  const deleteModule = useDeleteModule();
  const deletePage = useDeletePage();
  const { toast } = useToast();

  const [moduleDialog, setModuleDialog] = useState(false);
  const [pageDialog, setPageDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);

  const [editingModule, setEditingModule] = useState<Partial<DocModule>>({});
  const [editingPage, setEditingPage] = useState<Partial<DocPage>>({});
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
      toast({ title: "Módulo salvo!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleSavePage = async () => {
    if (!editingPage.title || !editingPage.module_id) return;
    try {
      const modulePages = allPages?.filter(p => p.module_id === editingPage.module_id) || [];
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
      toast({ title: "Página salva!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importTitle || !importModuleId || !importContent) return;
    try {
      const modulePages = allPages?.filter(p => p.module_id === importModuleId) || [];
      await upsertPage.mutateAsync({
        title: importTitle,
        slug: slugify(importTitle),
        module_id: importModuleId,
        content: importContent,
        order_index: modulePages.length,
      });
      setImportDialog(false);
      setImportContent("");
      setImportTitle("");
      setImportModuleId("");
      toast({ title: "Página importada!" });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">Administração</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialog} onOpenChange={setImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" /> Importar MD/HTML
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Markdown ou HTML</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título da página"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                />
                <Select value={importModuleId} onValueChange={setImportModuleId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o módulo" /></SelectTrigger>
                  <SelectContent>
                    {modules?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Arquivo (.md ou .html)
                  </label>
                  <input
                    type="file"
                    accept=".md,.html,.htm"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
                  />
                </div>
                <Textarea
                  placeholder="Ou cole o conteúdo aqui..."
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  rows={8}
                />
                <Button onClick={handleImport} className="w-full" disabled={!importTitle || !importModuleId || !importContent}>
                  Importar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Modules section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Módulos</h2>
            <Dialog open={moduleDialog} onOpenChange={(o) => { setModuleDialog(o); if (!o) setEditingModule({}); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Módulo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingModule.id ? "Editar" : "Novo"} Módulo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Título"
                    value={editingModule.title || ""}
                    onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  />
                  <Input
                    placeholder="Descrição (opcional)"
                    value={editingModule.description || ""}
                    onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  />
                  <Input
                    placeholder="Slug (auto-gerado)"
                    value={editingModule.slug || ""}
                    onChange={(e) => setEditingModule({ ...editingModule, slug: e.target.value })}
                  />
                  <Button onClick={handleSaveModule} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {modules?.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{mod.title}</p>
                  <p className="text-xs text-muted-foreground">/{mod.slug}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingModule(mod); setModuleDialog(true); }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Excluir módulo e todas as páginas?")) deleteModule.mutate(mod.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {(!modules || modules.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum módulo criado ainda.</p>
            )}
          </div>
        </section>

        {/* Pages section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Páginas</h2>
            <Dialog open={pageDialog} onOpenChange={(o) => { setPageDialog(o); if (!o) setEditingPage({}); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Página</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPage.id ? "Editar" : "Nova"} Página</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Título"
                    value={editingPage.title || ""}
                    onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                  />
                  <Select
                    value={editingPage.module_id || ""}
                    onValueChange={(v) => setEditingPage({ ...editingPage, module_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger>
                    <SelectContent>
                      {modules?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={editingPage.parent_page_id || "none"}
                    onValueChange={(v) => setEditingPage({ ...editingPage, parent_page_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Página pai (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma (raiz)</SelectItem>
                      {allPages
                        ?.filter((p) => p.module_id === editingPage.module_id && p.id !== editingPage.id)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Slug (auto-gerado)"
                    value={editingPage.slug || ""}
                    onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value })}
                  />
                  <Textarea
                    placeholder="Conteúdo em Markdown..."
                    value={editingPage.content || ""}
                    onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleSavePage} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {modules?.map((mod) => {
              const pages = allPages?.filter((p) => p.module_id === mod.id) || [];
              if (pages.length === 0) return null;
              return (
                <div key={mod.id} className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {mod.title}
                  </p>
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="flex items-center justify-between border border-border rounded-lg px-4 py-3 mb-1"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground text-sm">{page.title}</p>
                          <p className="text-xs text-muted-foreground">
                            /{mod.slug}/{page.slug}
                            {page.parent_page_id && " (subpágina)"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingPage(page); setPageDialog(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Excluir esta página?")) deletePage.mutate(page.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {(!allPages || allPages.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma página criada ainda.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

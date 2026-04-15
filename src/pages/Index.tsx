import { Link } from "react-router-dom";
import { BookOpen, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">Docs</span>
        </div>
        <Link to="/docs">
          <Button variant="ghost" size="sm">Documentação</Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
            <BookOpen className="h-4 w-4" />
            Base de Conhecimento
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Documentação centralizada e organizada
          </h1>

          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Crie, organize e compartilhe sua documentação com uma interface limpa e profissional. 
            Importe arquivos Markdown ou HTML e transforme-os em páginas bonitas automaticamente.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/docs">
              <Button size="lg" className="gap-2">
                <FileText className="h-5 w-5" />
                Ver Documentação
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-16">
            {[
              { icon: BookOpen, title: "Módulos", desc: "Organize por módulos e subpáginas hierárquicas" },
              { icon: FileText, title: "Markdown", desc: "Escreva em Markdown com suporte completo a GFM" },
              { icon: Upload, title: "Importação", desc: "Importe arquivos .md ou .html instantaneamente" },
            ].map((f, i) => (
              <div key={i} className="border border-border rounded-lg p-5 text-left hover:border-primary/30 transition-colors">
                <f.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
        Documentação • Construído com Lovable
      </footer>
    </div>
  );
}

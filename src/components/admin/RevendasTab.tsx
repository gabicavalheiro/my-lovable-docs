/**
 * RevendasTab — aba de Revendas do Admin
 * Coloque em: src/components/admin/RevendasTab.tsx
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  GitBranch,
  Users,
  TrendingUp,
  Activity,
  Search,
  Building2,
  Calendar,
  Award,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Revenda {
  id: string;
  nome_revenda: string;
  cnpj: string | null;
  email: string | null;
  created_at: string;
}

interface Atividade {
  id: string;
  cliente_id: string;
  tipo: "academia" | "diagnostico";
  page_title: string;
  score_pct: number;
  acertos: number;
  total: number;
  duracao_seg: number;
  tentativa: number;
  created_at: string;
}

interface RevendaComStats extends Revenda {
  totalAtividades: number;
  mediaScore: number;
  totalAcertos: number;
  totalQuestoes: number;
  titulosUnicos: number;
  ultimaAtividade: string | null;
  atividades: Atividade[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCNPJ(cnpj: string) {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuracao(seg: number) {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function scoreColor(score: number) {
  if (score >= 80) return "#4ade80";
  if (score >= 50) return "#facc15";
  return "#f87171";
}

function engajamentoLabel(total: number): { label: string; color: string } {
  if (total === 0) return { label: "Inativo", color: "hsl(240 4% 35%)" };
  if (total < 3)  return { label: "Iniciante", color: "#60a5fa" };
  if (total < 10) return { label: "Ativo", color: "#a78bfa" };
  return { label: "Engajado", color: "#4ade80" };
}

// ─── Componente de linha de atividade ─────────────────────────────────────────

function AtividadeRow({ a }: { a: Atividade }) {
  const Icon = a.tipo === "academia" ? GraduationCap : GitBranch;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "hsl(240 5% 10%)",
      border: "1px solid hsl(240 5% 16%)",
      borderRadius: 10,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: a.tipo === "academia" ? "rgba(139,92,246,.15)" : "rgba(20,184,166,.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon style={{ width: 13, height: 13, color: a.tipo === "academia" ? "#a78bfa" : "#2dd4bf" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "0.78rem", fontWeight: 600, color: "hsl(0 0% 85%)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{a.page_title}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.65rem", color: "hsl(240 4% 42%)" }}>{a.acertos}/{a.total} acertos</span>
          <span style={{ fontSize: "0.65rem", color: "hsl(240 4% 42%)" }}>⏱ {formatDuracao(a.duracao_seg)}</span>
          {a.tentativa > 1 && (
            <span style={{ fontSize: "0.65rem", color: "hsl(240 4% 38%)" }}>tentativa #{a.tentativa}</span>
          )}
          <span style={{ fontSize: "0.65rem", color: "hsl(240 4% 36%)" }}>{formatDateTime(a.created_at)}</span>
        </div>
      </div>
      <span style={{ fontWeight: 800, fontSize: "0.85rem", color: scoreColor(a.score_pct), flexShrink: 0 }}>
        {a.score_pct}%
      </span>
    </div>
  );
}

// ─── Card de revenda ──────────────────────────────────────────────────────────

function RevendaCard({ r }: { r: RevendaComStats }) {
  const [expanded, setExpanded] = useState(false);
  const { label: engLabel, color: engColor } = engajamentoLabel(r.totalAtividades);
  const inicial = r.nome_revenda.charAt(0).toUpperCase();

  return (
    <div style={{
      background: "hsl(240 5% 11%)",
      border: "1px solid hsl(240 5% 17%)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Cabeçalho do card */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%", textAlign: "left",
          padding: "16px 18px",
          display: "flex", alignItems: "center", gap: 14,
          background: "none", border: "none", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "hsl(240 5% 13%)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        {/* Avatar */}
        <span style={{
          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #5b21b6, #ff6b00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#fff",
        }}>
          {inicial}
        </span>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(0 0% 90%)" }}>
              {r.nome_revenda}
            </p>
            <span style={{
              fontSize: "0.65rem", fontWeight: 600, color: engColor,
              background: `${engColor}18`, padding: "1px 7px", borderRadius: 20,
              border: `1px solid ${engColor}30`,
            }}>
              {engLabel}
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
            {r.email && (
              <span style={{ fontSize: "0.7rem", color: "hsl(240 4% 45%)" }}>{r.email}</span>
            )}
            {r.cnpj && (
              <span style={{ fontSize: "0.7rem", color: "hsl(240 4% 38%)" }}>{formatCNPJ(r.cnpj)}</span>
            )}
            <span style={{ fontSize: "0.7rem", color: "hsl(240 4% 36%)" }}>
              Cadastro {formatDate(r.created_at)}
            </span>
          </div>
        </div>

        {/* Stats resumidas */}
        <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "hsl(0 0% 88%)" }}>
              {r.totalAtividades}
            </p>
            <p style={{ fontSize: "0.6rem", color: "hsl(240 4% 42%)", marginTop: 1 }}>atividades</p>
          </div>
          {r.totalAtividades > 0 && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: scoreColor(r.mediaScore) }}>
                {r.mediaScore}%
              </p>
              <p style={{ fontSize: "0.6rem", color: "hsl(240 4% 42%)", marginTop: 1 }}>média</p>
            </div>
          )}
          {r.totalAtividades > 0 && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "hsl(0 0% 80%)" }}>
                {r.titulosUnicos}
              </p>
              <p style={{ fontSize: "0.6rem", color: "hsl(240 4% 42%)", marginTop: 1 }}>conteúdos</p>
            </div>
          )}
        </div>

        {/* Chevron */}
        <div style={{ color: "hsl(240 4% 40%)", flexShrink: 0 }}>
          {expanded
            ? <ChevronDown style={{ width: 16, height: 16 }} />
            : <ChevronRight style={{ width: 16, height: 16 }} />}
        </div>
      </button>

      {/* Painel expandido */}
      {expanded && (
        <div style={{ borderTop: "1px solid hsl(240 5% 16%)", padding: "16px 18px", background: "hsl(240 5% 9%)" }}>

          {/* Stats detalhadas */}
          {r.totalAtividades > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10, marginBottom: 16,
            }}>
              {[
                { label: "Total de acertos", value: `${r.totalAcertos}/${r.totalQuestoes}`, icon: "✓" },
                { label: "Conteúdos únicos", value: r.titulosUnicos, icon: "📄" },
                { label: "Última atividade", value: r.ultimaAtividade ? formatDate(r.ultimaAtividade) : "—", icon: "🕐" },
                { label: "Média geral", value: `${r.mediaScore}%`, icon: "📊" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  background: "hsl(240 5% 12%)",
                  border: "1px solid hsl(240 5% 17%)",
                  borderRadius: 10, padding: "10px 12px",
                }}>
                  <p style={{ fontSize: "0.65rem", color: "hsl(240 4% 44%)", marginBottom: 4 }}>
                    {icon} {label}
                  </p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(0 0% 88%)" }}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Histórico de atividades */}
          {r.atividades.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(240 4% 44%)", marginBottom: 4 }}>
                HISTÓRICO DE ATIVIDADES
              </p>
              {r.atividades.map((a) => (
                <AtividadeRow key={a.id} a={a} />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: "24px 0",
              color: "hsl(240 4% 38%)", fontSize: "0.8rem",
            }}>
              <Activity style={{ width: 28, height: 28, margin: "0 auto 8px", opacity: 0.3 }} />
              <p>Nenhuma atividade registrada ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RevendasTab principal ────────────────────────────────────────────────────

export function RevendasTab() {
  const [revendas, setRevendas] = useState<RevendaComStats[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busca, setBusca]       = useState("");
  const [ordenar, setOrdenar]   = useState<"nome" | "atividades" | "media" | "recente">("atividades");

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: clientes }, { data: atividades }] = await Promise.all([
        supabase.from("clientes" as any).select("id, nome_revenda, cnpj, email, created_at").order("created_at", { ascending: false }),
        supabase.from("atividades" as any).select("*").order("created_at", { ascending: false }),
      ]);

      const ativList: Atividade[] = (atividades as unknown as Atividade[]) ?? [];

      const result: RevendaComStats[] = ((clientes as unknown as Revenda[]) ?? []).map((r) => {
        const minhas = ativList.filter((a) => a.cliente_id === r.id);
        const total  = minhas.length;
        const media  = total > 0
          ? Math.round(minhas.reduce((s, a) => s + (a.score_pct ?? 0), 0) / total)
          : 0;
        const acertos  = minhas.reduce((s, a) => s + (a.acertos ?? 0), 0);
        const questoes = minhas.reduce((s, a) => s + (a.total ?? 0), 0);
        const unicos   = new Set(minhas.map((a) => a.page_title)).size;
        const ultima   = minhas.length > 0 ? minhas[0].created_at : null;

        return {
          ...r,
          totalAtividades: total,
          mediaScore: media,
          totalAcertos: acertos,
          totalQuestoes: questoes,
          titulosUnicos: unicos,
          ultimaAtividade: ultima,
          atividades: minhas,
        };
      });

      setRevendas(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // Filtro + ordenação
  const filtradas = revendas
    .filter((r) => {
      const q = busca.toLowerCase();
      return (
        r.nome_revenda.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.cnpj ?? "").includes(q)
      );
    })
    .sort((a, b) => {
      if (ordenar === "nome")       return a.nome_revenda.localeCompare(b.nome_revenda);
      if (ordenar === "atividades") return b.totalAtividades - a.totalAtividades;
      if (ordenar === "media")      return b.mediaScore - a.mediaScore;
      if (ordenar === "recente") {
        if (!a.ultimaAtividade && !b.ultimaAtividade) return 0;
        if (!a.ultimaAtividade) return 1;
        if (!b.ultimaAtividade) return -1;
        return new Date(b.ultimaAtividade).getTime() - new Date(a.ultimaAtividade).getTime();
      }
      return 0;
    });

  // Estatísticas gerais
  const totalRevendas    = revendas.length;
  const revendasAtivas   = revendas.filter((r) => r.totalAtividades > 0).length;
  const totalAtividades  = revendas.reduce((s, r) => s + r.totalAtividades, 0);
  const mediaGeral       = revendasAtivas > 0
    ? Math.round(revendas.filter((r) => r.totalAtividades > 0).reduce((s, r) => s + r.mediaScore, 0) / revendasAtivas)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Revendas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e acompanhe o progresso de cada revenda.
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={carregar}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo geral */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { icon: <Users style={{ width: 16, height: 16 }} />, label: "Total de revendas", value: totalRevendas, color: "#60a5fa" },
          { icon: <Activity style={{ width: 16, height: 16 }} />, label: "Revendas ativas", value: revendasAtivas, color: "#a78bfa" },
          { icon: <TrendingUp style={{ width: 16, height: 16 }} />, label: "Total de atividades", value: totalAtividades, color: "#2dd4bf" },
          { icon: <Award style={{ width: 16, height: 16 }} />, label: "Média geral", value: `${mediaGeral}%`, color: scoreColor(mediaGeral) },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="border border-border rounded-xl p-4" style={{ background: "hsl(240 5% 10%)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color }}>
              {icon}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(0 0% 92%)", lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            width: 14, height: 14, color: "hsl(240 4% 45%)",
          }} />
          <Input
            placeholder="Buscar por nome, e-mail ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["atividades", "media", "recente", "nome"] as const).map((o) => {
            const labels = { atividades: "Mais ativas", media: "Melhor média", recente: "Mais recente", nome: "A–Z" };
            return (
              <button
                key={o}
                onClick={() => setOrdenar(o)}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 500,
                  border: `1px solid ${ordenar === o ? "rgba(91,33,182,.5)" : "hsl(240 5% 22%)"}`,
                  background: ordenar === o ? "rgba(91,33,182,.15)" : "transparent",
                  color: ordenar === o ? "#a78bfa" : "hsl(240 4% 55%)",
                  cursor: "pointer", transition: "all .15s",
                }}
              >
                {labels[o]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de revendas */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: 80, borderRadius: 14,
              background: "hsl(240 5% 11%)",
              border: "1px solid hsl(240 5% 17%)",
              animation: "pulse 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      ) : filtradas.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((r) => (
            <RevendaCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "48px 0",
          color: "hsl(240 4% 40%)",
        }}>
          <Building2 style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: "0.9rem" }}>
            {busca ? "Nenhuma revenda encontrada para essa busca." : "Nenhuma revenda cadastrada ainda."}
          </p>
          {busca && (
            <button
              onClick={() => setBusca("")}
              style={{ marginTop: 8, fontSize: "0.8rem", color: "#a78bfa", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Limpar busca
            </button>
          )}
        </div>
      )}

      {/* Rodapé com contagem */}
      {!loading && filtradas.length > 0 && (
        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "hsl(240 4% 35%)" }}>
          {filtradas.length} {filtradas.length === 1 ? "revenda" : "revendas"} exibida{filtradas.length > 1 ? "s" : ""}
          {busca && ` (filtrado de ${totalRevendas})`}
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
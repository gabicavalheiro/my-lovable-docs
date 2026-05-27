import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart2, BookOpen, Trophy, User, LogOut,
  ArrowLeft, TrendingUp, Clock, CheckCircle2,
  Star, Zap, Target, GraduationCap, GitBranch,
} from "lucide-react";

interface ClientePerfil {
  nome_revenda: string;
  cnpj:         string;
  email:        string;
  created_at:   string;
}

interface Atividade {
  id:          string;
  tipo:        "academia" | "diagnostico";
  page_title:  string;
  score_pct:   number;
  acertos:     number;
  total:       number;
  duracao_seg: number;
  tentativa:   number;
  created_at:  string;
}

const G = "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)";

const TABS = [
  { id: "overview",   label: "Visão geral",  icon: BarChart2  },
  { id: "atividades", label: "Atividades",    icon: TrendingUp },
  { id: "conquistas", label: "Conquistas",    icon: Trophy     },
  { id: "perfil",     label: "Perfil",        icon: User       },
] as const;

type TabId = typeof TABS[number]["id"];

function formatCNPJ(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function formatDuracao(seg: number) {
  if (seg < 60) return seg + "s";
  return Math.floor(seg / 60) + "m " + (seg % 60) + "s";
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div style={{ background: "hsl(240 5% 11%)", border: "1px solid hsl(240 5% 17%)",
      borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: color,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 17, height: 17, color: "#fff" }} />
      </div>
      <div>
        <p style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(0 0% 92%)", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: "0.75rem", color: "hsl(240 4% 50%)", marginTop: 3 }}>{label}</p>
      </div>
    </div>
  );
}

function BadgeCard({ icon, label, desc, unlocked }: {
  icon: string; label: string; desc: string; unlocked: boolean;
}) {
  return (
    <div style={{ background: "hsl(240 5% 11%)",
      border: "1px solid " + (unlocked ? "rgba(91,33,182,.4)" : "hsl(240 5% 17%)"),
      borderRadius: 14, padding: "18px 16px", textAlign: "center", opacity: unlocked ? 1 : .45 }}>
      <div style={{ fontSize: "2rem", marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(0 0% 88%)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: "0.68rem", color: "hsl(240 4% 46%)", lineHeight: 1.5 }}>{desc}</p>
      {unlocked && (
        <span style={{ display: "inline-block", marginTop: 8, fontSize: "0.62rem", fontWeight: 700,
          letterSpacing: ".08em", color: "#a78bfa", textTransform: "uppercase" }}>Desbloqueada</span>
      )}
    </div>
  );
}

function AtividadeRow({ a, detailed }: { a: Atividade; detailed?: boolean }) {
  const scoreColor = a.score_pct >= 80 ? "#4ade80" : a.score_pct >= 60 ? "#a78bfa" : "#fb923c";
  const Icon = a.tipo === "academia" ? GraduationCap : GitBranch;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
      background: "hsl(240 5% 13%)", border: "1px solid hsl(240 5% 17%)", borderRadius: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: a.tipo === "academia" ? "rgba(139,92,246,.2)" : "rgba(20,184,166,.2)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 15, height: 15, color: a.tipo === "academia" ? "#a78bfa" : "#2dd4bf" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(0 0% 88%)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.page_title}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.68rem", color: "hsl(240 4% 44%)" }}>{a.acertos}/{a.total} acertos</span>
          <span style={{ fontSize: "0.68rem", color: "hsl(240 4% 44%)" }}>⏱ {formatDuracao(a.duracao_seg)}</span>
          {a.tentativa > 1 && (
            <span style={{ fontSize: "0.68rem", color: "hsl(240 4% 44%)" }}>tentativa #{a.tentativa}</span>
          )}
          {detailed && (
            <span style={{ fontSize: "0.68rem", color: "hsl(240 4% 36%)" }}>
              {new Date(a.created_at).toLocaleString("pt-BR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: scoreColor, flexShrink: 0 }}>{a.score_pct}%</div>
    </div>
  );
}

export default function DesempenhoPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate("/login", { replace: true }); return; }
    Promise.all([
      supabase.from("clientes" as any).select("nome_revenda, cnpj, email, created_at")
        .eq("id", user.id).maybeSingle(),
      supabase.from("atividades" as any).select("*")
        .eq("cliente_id", user.id).order("created_at", { ascending: false }),
    ]).then(([{ data: pData }, { data: aData }]) => {
      setPerfil((pData as unknown as ClientePerfil | null) ?? null);
      setAtividades((aData as unknown as Atividade[]) ?? []);
      setLoading(false);
    });
  }, [user, navigate]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const nomeRevenda = perfil?.nome_revenda ?? user?.email ?? "Revenda";
  const inicial = nomeRevenda.charAt(0).toUpperCase();

  const totalAtividades = atividades.length;
  const mediaScore = totalAtividades > 0
    ? Math.round(atividades.reduce((s, a) => s + (a.score_pct ?? 0), 0) / totalAtividades) : 0;
  const totalAcertos = atividades.reduce((s, a) => s + (a.acertos ?? 0), 0);
  const totalQuestoes = atividades.reduce((s, a) => s + (a.total ?? 0), 0);
  const titulosUnicos = new Set(atividades.map(a => a.page_title)).size;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "hsl(240 5% 8%)" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%",
        border: "3px solid rgba(91,33,182,.3)", borderTopColor: "#5b21b6",
        animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "hsl(240 5% 8%)", color: "hsl(0 0% 92%)" }}>
      <header style={{ height: 56, display: "flex", alignItems: "center",
        padding: "0 clamp(1rem,3vw,2rem)", borderBottom: "1px solid hsl(240 5% 14%)",
        background: "hsl(240 5% 8% / .9)", backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 40, gap: 12 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 6,
          color: "hsl(240 4% 50%)", textDecoration: "none", fontSize: "0.78rem" }}
          onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 80%)")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(240 4% 50%)")}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Voltar
        </Link>
        <div style={{ flex: 1 }} />
        <img src="/velo-logo.png" alt="Velo" style={{ height: 28, width: "auto" }} />
        <div style={{ flex: 1 }} />
        <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8, border: "none", background: "transparent",
          color: "hsl(0 84% 65%)", fontSize: "0.75rem", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "hsl(0 84% 60% / .1)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          <LogOut style={{ width: 13, height: 13 }} /> Sair
        </button>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,3vw,2rem)" }}>

        {/* Perfil hero */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32,
          padding: "20px 24px", background: "hsl(240 5% 11%)",
          border: "1px solid hsl(240 5% 17%)", borderRadius: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: G, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>{inicial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(0 0% 92%)" }}>{nomeRevenda}</p>
            <p style={{ fontSize: "0.75rem", color: "hsl(240 4% 50%)" }}>{user?.email}</p>
            {perfil?.created_at && (
              <p style={{ fontSize: "0.68rem", color: "hsl(240 4% 38%)", marginTop: 2 }}>
                Desde {formatDate(perfil.created_at)}
              </p>
            )}
          </div>
          <div style={{ padding: "6px 14px", borderRadius: 99,
            background: "rgba(91,33,182,.2)", border: "1px solid rgba(91,33,182,.35)",
            fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa",
            display: "flex", alignItems: "center", gap: 5 }}>
            <Star style={{ width: 12, height: 12 }} /> Nível 1
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "hsl(240 5% 11%)",
          borderRadius: 12, padding: 4, border: "1px solid hsl(240 5% 17%)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "8px 12px", borderRadius: 9, border: "none",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              background: tab === id ? "hsl(240 5% 17%)" : "transparent",
              color: tab === id ? "hsl(0 0% 90%)" : "hsl(240 4% 50%)",
              transition: "background .15s, color .15s" }}>
              <Icon style={{ width: 13, height: 13 }} />{label}
            </button>
          ))}
        </div>

        {/* ── Visão geral ── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
              <StatCard icon={BookOpen}     label="Quizzes feitos"    value={totalAtividades} color="rgba(139,92,246,.6)" />
              <StatCard icon={CheckCircle2} label="Acertos totais"     value={totalAcertos + "/" + totalQuestoes} color="rgba(20,184,166,.6)" />
              <StatCard icon={TrendingUp}   label="Média de score"     value={totalAtividades > 0 ? mediaScore + "%" : "—"} color="rgba(251,146,60,.6)" />
              <StatCard icon={Target}       label="Tópicos visitados"  value={titulosUnicos} color="rgba(236,72,153,.6)" />
            </div>

            <div style={{ background: "hsl(240 5% 11%)", border: "1px solid hsl(240 5% 17%)",
              borderRadius: 14, padding: "20px 22px" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(0 0% 80%)", marginBottom: 16,
                display: "flex", alignItems: "center", gap: 6 }}>
                <Clock style={{ width: 13, height: 13 }} /> Atividade recente
              </p>
              {atividades.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "32px 0", gap: 8, color: "hsl(240 4% 38%)" }}>
                  <Zap style={{ width: 28, height: 28, opacity: .3 }} />
                  <p style={{ fontSize: "0.78rem" }}>Nenhuma atividade registrada ainda.</p>
                  <Link to="/docs" style={{ marginTop: 8, padding: "8px 20px", borderRadius: 99,
                    background: G, color: "#fff", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                    Começar a ler →
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {atividades.slice(0, 5).map(a => <AtividadeRow key={a.id} a={a} />)}
                  {atividades.length > 5 && (
                    <button onClick={() => setTab("atividades")} style={{
                      background: "transparent", border: "none", color: "#a78bfa",
                      fontSize: "0.75rem", cursor: "pointer", padding: "4px 0" }}>
                      Ver todas ({atividades.length}) →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Atividades ── */}
        {tab === "atividades" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {atividades.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "hsl(240 4% 40%)" }}>
                <Zap style={{ width: 32, height: 32, opacity: .3, margin: "0 auto 12px" }} />
                <p>Nenhuma atividade ainda. Complete um quiz da Academia!</p>
              </div>
            ) : atividades.map(a => <AtividadeRow key={a.id} a={a} detailed />)}
          </div>
        )}

        {/* ── Conquistas ── */}
        {tab === "conquistas" && (
          <div>
            <p style={{ fontSize: "0.72rem", color: "hsl(240 4% 40%)", marginBottom: 16 }}>
              Complete ações na plataforma para desbloquear conquistas.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 12 }}>
              <BadgeCard icon="🚀" label="Primeiro acesso"  desc="Fez login pela primeira vez"   unlocked={true} />
              <BadgeCard icon="📖" label="Primeiro quiz"     desc="Completou um quiz da Academia" unlocked={totalAtividades >= 1} />
              <BadgeCard icon="🎯" label="Acerto certeiro"   desc="100% de acertos em um quiz"    unlocked={atividades.some(a => a.score_pct === 100)} />
              <BadgeCard icon="🔥" label="Explorador"        desc="5 tópicos diferentes"          unlocked={titulosUnicos >= 5} />
              <BadgeCard icon="🏆" label="Mestre Velo"       desc="10 quizzes completados"        unlocked={totalAtividades >= 10} />
              <BadgeCard icon="⚡" label="Speed reader"      desc="Quiz em menos de 2 minutos"    unlocked={atividades.some(a => a.duracao_seg < 120 && a.total > 0)} />
            </div>
          </div>
        )}

        {/* ── Perfil ── */}
        {tab === "perfil" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "hsl(240 5% 11%)", border: "1px solid hsl(240 5% 17%)",
              borderRadius: 14, overflow: "hidden" }}>
              {[
                { label: "Nome da revenda", value: perfil?.nome_revenda ?? "—" },
                { label: "CNPJ",            value: perfil?.cnpj ? formatCNPJ(perfil.cnpj) : "—" },
                { label: "E-mail",          value: perfil?.email ?? user?.email ?? "—" },
                { label: "Cadastro em",     value: perfil?.created_at ? formatDate(perfil.created_at) : "—" },
              ].map(({ label, value }, i, arr) => (
                <div key={label} style={{ display: "flex", alignItems: "center", padding: "14px 20px",
                  borderBottom: i < arr.length - 1 ? "1px solid hsl(240 5% 16%)" : "none" }}>
                  <p style={{ width: 150, fontSize: "0.75rem", color: "hsl(240 4% 46%)", flexShrink: 0 }}>{label}</p>
                  <p style={{ fontSize: "0.82rem", color: "hsl(0 0% 88%)", fontWeight: 500 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "hsl(240 5% 11%)", border: "1px solid hsl(240 5% 17%)",
              borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(0 0% 80%)" }}>Alterar senha</p>
                <p style={{ fontSize: "0.7rem", color: "hsl(240 4% 44%)", marginTop: 2 }}>Um e-mail de redefinição será enviado</p>
              </div>
              <button onClick={async () => {
                if (!user?.email) return;
                await supabase.auth.resetPasswordForEmail(user.email);
                alert("E-mail de redefinição enviado!");
              }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid hsl(240 5% 24%)",
                background: "transparent", color: "hsl(0 0% 75%)", fontSize: "0.75rem",
                fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "hsl(240 5% 16%)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                Enviar e-mail
              </button>
            </div>

            <button onClick={handleSignOut} style={{ width: "100%", padding: "12px", borderRadius: 12,
              border: "1px solid hsl(0 84% 50% / .3)", background: "hsl(0 84% 60% / .07)",
              color: "hsl(0 84% 65%)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = "hsl(0 84% 60% / .14)")}
              onMouseLeave={e => (e.currentTarget.style.background = "hsl(0 84% 60% / .07)")}>
              <LogOut style={{ width: 14, height: 14 }} /> Sair da conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
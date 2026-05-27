import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, BarChart2, LogIn, ChevronDown } from "lucide-react";

interface ClientePerfil {
  nome_revenda: string;
  cnpj: string;
  created_at: string;
}

export function UserMenu({ navLinkSize }: { navLinkSize: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Carrega perfil da tabela clientes
  useEffect(() => {
    if (!user) { setPerfil(null); return; }
    supabase
      .from("clientes" as any)
      .select("nome_revenda, cnpj, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error) setPerfil((data as unknown as ClientePerfil | null) ?? null);
      });
  }, [user]);
  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/", { replace: true });
  };

  /* ── Não logado ── */
  if (!user) {
    return (
      <Link
        to="/login"
        style={{
          display: "flex", alignItems: "center",
          gap: "clamp(.3rem,.5vw,.4rem)",
          padding: "clamp(.3rem,.5vw,.4rem) clamp(.65rem,1.2vw,.9rem)",
          borderRadius: 9, fontSize: navLinkSize, fontWeight: 500,
          border: "1px solid hsl(240 5% 22%)", color: "hsl(0 0% 75%)",
          textDecoration: "none", transition: "background .18s, border-color .18s",
        }}
        className="velo-btn-b"
      >
        <LogIn style={{ width: "clamp(12px,.9vw,15px)", height: "clamp(12px,.9vw,15px)" }} />
        <span className="velo-hide-mobile">Entrar</span>
      </Link>
    );
  }

  /* ── Logado ── */
  const nomeRevenda = perfil?.nome_revenda ?? user.email ?? "Minha conta";
  const inicial = nomeRevenda.charAt(0).toUpperCase();

  const formatCNPJ = (cnpj: string) =>
    cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center",
          gap: "clamp(.3rem,.5vw,.4rem)",
          padding: "clamp(.25rem,.4vw,.35rem) clamp(.5rem,1vw,.75rem)",
          borderRadius: 9, fontSize: navLinkSize, fontWeight: 500,
          border: "1px solid hsl(240 5% 22%)", color: "hsl(0 0% 82%)",
          background: "transparent", cursor: "pointer",
          transition: "background .18s, border-color .18s",
        }}
        className="velo-btn-b"
      >
        {/* Avatar */}
        <span style={{
          width: "clamp(20px,1.6vw,24px)", height: "clamp(20px,1.6vw,24px)",
          borderRadius: "50%", background: "var(--brand-gradient)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "clamp(9px,.7vw,11px)", fontWeight: 700, color: "#fff", flexShrink: 0,
        }}>
          {inicial}
        </span>
        <span className="velo-hide-mobile" style={{
          maxWidth: "clamp(60px,8vw,120px)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {nomeRevenda}
        </span>
        <ChevronDown style={{
          width: "clamp(10px,.8vw,13px)", height: "clamp(10px,.8vw,13px)",
          transition: "transform .2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 260, zIndex: 100,
          background: "hsl(240 5% 11%)",
          border: "1px solid hsl(240 5% 18%)",
          borderRadius: 14,
          boxShadow: "0 16px 48px rgba(0,0,0,.55)",
          overflow: "hidden",
          animation: "veloFadeUp .18s ease both",
        }}>

          {/* Cabeçalho do perfil */}
          <div style={{
            padding: "14px 16px 12px",
            borderBottom: "1px solid hsl(240 5% 16%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "var(--brand-gradient)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0,
              }}>
                {inicial}
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: "0.82rem", fontWeight: 600,
                  color: "hsl(0 0% 90%)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {nomeRevenda}
                </p>
                <p style={{
                  fontSize: "0.72rem", color: "hsl(240 4% 50%)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user.email}
                </p>
              </div>
            </div>

            {/* Dados da revenda */}
            {perfil && (
              <div style={{
                background: "hsl(240 5% 8%)",
                borderRadius: 8, padding: "8px 10px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                {perfil.cnpj && (
                  <p style={{ fontSize: "0.7rem", color: "hsl(240 4% 48%)" }}>
                    <span style={{ color: "hsl(240 4% 35%)" }}>CNPJ </span>
                    {formatCNPJ(perfil.cnpj)}
                  </p>
                )}
                <p style={{ fontSize: "0.7rem", color: "hsl(240 4% 48%)" }}>
                  <span style={{ color: "hsl(240 4% 35%)" }}>Cadastro </span>
                  {formatDate(perfil.created_at)}
                </p>
              </div>
            )}
          </div>

          {/* Ações */}
          <div style={{ padding: "6px 6px" }}>
            <MenuItem
              icon={<BarChart2 style={{ width: 14, height: 14 }} />}
              label="Meu desempenho"
              onClick={() => { setOpen(false); navigate("/desempenho"); }}
            />
            <MenuItem
              icon={<User style={{ width: 14, height: 14 }} />}
              label="Trocar conta"
              onClick={async () => { setOpen(false); await signOut(); navigate("/login"); }}
            />
          </div>

          {/* Sair */}
          <div style={{ padding: "0 6px 6px" }}>
            <button
              onClick={handleSignOut}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: 8, padding: "8px 10px", borderRadius: 8,
                fontSize: "0.78rem", fontWeight: 500,
                color: "hsl(0 84% 65%)",
                background: "transparent", border: "none", cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "hsl(0 84% 60% / .1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: {
  icon: React.ReactNode; label: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center",
        gap: 8, padding: "8px 10px", borderRadius: 8,
        fontSize: "0.78rem", fontWeight: 500,
        color: hover ? "hsl(0 0% 90%)" : "hsl(240 4% 58%)",
        background: hover ? "hsl(240 5% 16%)" : "transparent",
        border: "none", cursor: "pointer",
        transition: "background .15s, color .15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

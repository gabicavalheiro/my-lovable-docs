import { Link } from "react-router-dom";
import { BookOpen, FileText, ArrowRight, Search, ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useModules, useAllPages } from "@/hooks/useDocData";
import { SearchModal } from "@/components/docs/SearchModal";

/*
  ESCALA FLUIDA — todos os valores crescem linearmente com a viewport.

  Fórmula:  clamp(MIN, PREFERRED, MAX)
  PREFERRED: valor em vw + offset em rem para que a curva comece no ponto certo.

  Breakpoints de referência:
    360px  → mobile pequeno  (mínimo)
    768px  → tablet
   1280px  → desktop
   1920px  → tela grande     (máximo)

  Mapeamento de tamanhos:
    hero title   : 2.2rem  →  5rem       (360→1920)
    hero sub     : 0.95rem →  1.35rem
    pill / label : 0.65rem →  0.85rem
    stat value   : 1.3rem  →  2.2rem
    stat label   : 0.65rem →  0.85rem
    card title   : 0.85rem →  1.1rem
    card desc    : 0.72rem →  0.9rem
    card meta    : 0.65rem →  0.78rem
    feature title: 0.8rem  →  1rem
    feature desc : 0.7rem  →  0.85rem
    footer       : 0.7rem  →  0.85rem
    section label: 0.62rem →  0.78rem
*/

const T = {
  heroTitle : "clamp(2.2rem,  2rem + 3.5vw,  5rem)",
  heroSub   : "clamp(0.95rem, 0.88rem + 0.45vw, 1.35rem)",
  pill      : "clamp(0.65rem, 0.6rem  + 0.28vw, 0.85rem)",
  statValue : "clamp(1.3rem,  1.1rem  + 1.1vw,  2.2rem)",
  statLabel : "clamp(0.65rem, 0.6rem  + 0.28vw, 0.85rem)",
  sectionLbl: "clamp(0.62rem, 0.57rem + 0.28vw, 0.78rem)",
  cardTitle : "clamp(0.85rem, 0.78rem + 0.38vw, 1.1rem)",
  cardDesc  : "clamp(0.72rem, 0.67rem + 0.28vw, 0.9rem)",
  cardMeta  : "clamp(0.65rem, 0.6rem  + 0.25vw, 0.78rem)",
  featTitle : "clamp(0.8rem,  0.74rem + 0.32vw, 1rem)",
  featDesc  : "clamp(0.7rem,  0.65rem + 0.26vw, 0.85rem)",
  footer    : "clamp(0.7rem,  0.65rem + 0.26vw, 0.85rem)",
  btnText   : "clamp(0.82rem, 0.75rem + 0.38vw, 1rem)",
  navLogo   : "clamp(1rem,    0.9rem  + 0.5vw,  1.4rem)",
  navLink   : "clamp(0.75rem, 0.7rem  + 0.28vw, 0.95rem)",
} as const;

const fadeUp = (ms = 0): React.CSSProperties => ({
  animation: `veloFadeUp 0.55s cubic-bezier(0.22,1,0.36,1) ${ms}ms both`,
});

export default function Index() {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");

  const { data: modules }  = useModules();
  const { data: allPages } = useAllPages();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleClose = () => { setOpen(false); setQuery(""); };

  const getFirstPage = (id: string) =>
    allPages?.find((p) => p.module_id === id && !p.parent_page_id);
  const getPageCount = (id: string) =>
    allPages?.filter((p) => p.module_id === id).length ?? 0;

  const rootModules = useMemo(
    () => modules?.filter((m) => !(m as any).parent_module_id) ?? [],
    [modules],
  );
  const totalPages = allPages?.length ?? 0;

  return (
    <>
      <style>{`
        @keyframes veloFadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes veloPulse {
          0%,100%{ opacity:1; transform:scale(1); }
          50%    { opacity:.45; transform:scale(.7); }
        }
        @keyframes veloDriftA {
          0%  { transform:translate(0,0) scale(1); }
          100%{ transform:translate(3%,4%) scale(1.07); }
        }
        @keyframes veloDriftB {
          0%  { transform:translate(0,0) scale(1); }
          100%{ transform:translate(-4%,-3%) scale(1.09); }
        }

        /* ── Card hover ── */
        .velo-card {
          transition: background .2s, border-color .2s, transform .22s, box-shadow .22s;
        }
        .velo-card:hover {
          background: hsl(240 5% 12%) !important;
          border-color: rgba(91,33,182,.45) !important;
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(91,33,182,.15);
        }
        .velo-card:hover .velo-arrow {
          transform: translateX(5px);
          color: #f97316;
        }
        .velo-arrow { transition: transform .2s, color .2s; }

        /* ── Botões ── */
        .velo-btn-a {
          transition: transform .18s, box-shadow .18s, opacity .18s;
        }
        .velo-btn-a:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(91,33,182,.45) !important;
          opacity: .92;
        }
        .velo-btn-b {
          transition: background .18s, border-color .18s, transform .18s;
        }
        .velo-btn-b:hover {
          background: rgba(255,255,255,.09) !important;
          border-color: rgba(255,255,255,.24) !important;
          transform: translateY(-1px);
        }

        /* ── Features ── */
        .velo-feat { transition: background .2s; cursor:default; }
        .velo-feat:hover { background: hsl(240 5% 13%) !important; }

        /* ── Divisória responsiva ── */
        .velo-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: clamp(.5rem, 1.5vw, .75rem);
        }

        /* ── Mobile overrides ── */
        @media (max-width: 600px) {
          .velo-hide-mobile  { display:none !important; }
          .velo-actions      { flex-direction:column; align-items:stretch; }
          .velo-actions a    { justify-content:center; }
          .velo-modules-grid { grid-template-columns:1fr !important; }
          .velo-feats        { grid-template-columns:1fr 1fr !important; }
        }
        @media (max-width: 380px) {
          .velo-feats { grid-template-columns:1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        background: "hsl(240 5% 8%)", color: "hsl(0 0% 92%)", overflowX: "hidden" }}>

        {/* ── Atmosfera ── */}
        <div aria-hidden style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
          <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"55%", height:"60%",
            background:"radial-gradient(ellipse, rgba(90,33,182,.24) 0%, transparent 70%)",
            animation:"veloDriftA 13s ease-in-out infinite alternate" }} />
          <div style={{ position:"absolute", bottom:"-15%", right:"-5%", width:"45%", height:"55%",
            background:"radial-gradient(ellipse, rgba(200,70,20,.14) 0%, transparent 70%)",
            animation:"veloDriftB 17s ease-in-out infinite alternate" }} />
        </div>

        {/* ── Header ── */}
        <header style={{
          height: "clamp(3rem, 3.5rem + .5vw, 4rem)",
          display:"flex", alignItems:"center",
          padding: "0 clamp(.75rem, 2vw, 1.5rem)",
          position:"sticky", top:0, zIndex:40,
          background:"hsl(240 5% 8% / .85)",
          borderBottom:"1px solid hsl(240 5% 15%)",
          backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
        }}>
          {/* Logo */}
          <div style={{ flexShrink:0 }}>
            <img src="/velo-logo.png" alt="Velo" style={{ height:"clamp(32px,4.5vw,48px)", width:"auto", display:"block" }} />
          </div>

          {/* Busca */}
          <div style={{ flex:1, display:"flex", justifyContent:"center",
            padding: "0 clamp(.5rem, 2vw, 1.5rem)" }}>
            <button onClick={() => setOpen(true)}
              style={{ display:"flex", alignItems:"center",
                gap:"clamp(.5rem,.8vw,.75rem)",
                padding: "clamp(.3rem,.5vw,.4rem) clamp(.75rem,1.5vw,1rem)",
                borderRadius:10, width:"100%", maxWidth: "clamp(240px, 40vw, 480px)",
                border:"1px solid hsl(240 5% 17%)", background:"hsl(240 5% 13% / .8)",
                color:"hsl(240 4% 52%)", fontSize:T.navLink, cursor:"pointer" }}>
              <Search style={{ width:"clamp(14px,1.2vw,18px)", height:"clamp(14px,1.2vw,18px)", flexShrink:0 }} />
              <span style={{ flex:1, textAlign:"left" }}>Buscar...</span>
              <kbd className="velo-hide-mobile" style={{ fontSize:T.cardMeta, fontFamily:"monospace",
                padding:".15rem .4rem", borderRadius:5,
                background:"hsl(240 5% 8%)", border:"1px solid hsl(240 5% 17%)" }}>
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Ações */}
          <div style={{ display:"flex", alignItems:"center",
            gap:"clamp(.4rem,.8vw,.6rem)", flexShrink:0 }}>
            <Link to="/docs" className="velo-btn-b"
              style={{ display:"flex", alignItems:"center",
                gap:"clamp(.3rem,.5vw,.4rem)",
                padding: "clamp(.3rem,.5vw,.4rem) clamp(.65rem,1.2vw,.9rem)",
                borderRadius:9, fontSize:T.navLink, fontWeight:500,
                border:"1px solid hsl(240 5% 22%)", color:"hsl(0 0% 75%)",
                textDecoration:"none" }}>
              Ver docs <ArrowRight style={{ width:"clamp(12px,.9vw,15px)", height:"clamp(12px,.9vw,15px)" }} />
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          padding: "clamp(5rem,8vw,8rem) clamp(1rem,4vw,2rem) clamp(3rem,6vw,5rem)",
          position:"relative", zIndex:1 }}>

          <div style={{ textAlign:"center", width:"100%",
            maxWidth:"clamp(300px, 80vw, 760px)",
            marginBottom:"clamp(2.5rem,5vw,5rem)" }}>

            {/* Pill */}
            <div style={{ ...fadeUp(0), display:"inline-flex", alignItems:"center",
              gap:"clamp(.4rem,.6vw,.5rem)",
              padding: "clamp(.25rem,.4vw,.35rem) clamp(.75rem,1.5vw,1rem)",
              borderRadius:99, marginBottom:"clamp(1rem,2vw,1.75rem)",
              background:"linear-gradient(135deg,rgba(91,33,182,.2),rgba(255,107,0,.14))",
              border:"1px solid rgba(91,33,182,.4)", color:"hsl(262 70% 72%)",
              fontSize:T.pill, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" }}>
              <span style={{ width:"clamp(5px,1vw,7px)", height:"clamp(5px,1vw,7px)",
                borderRadius:"50%", background:"var(--brand-gradient)",
                display:"inline-block", animation:"veloPulse 2s infinite" }} />
              Central de documentação
            </div>

            {/* Título */}
            <h1 style={{ ...fadeUp(80), fontSize:T.heroTitle,
              fontWeight:800, lineHeight:1.06, letterSpacing:"-.03em",
              color:"hsl(0 0% 96%)", margin: `0 0 clamp(.75rem,1.5vw,1.25rem)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexWrap:"wrap", gap:"clamp(.4rem,.8vw,.6rem)" }}>
              Bem-vindo ao
              <img
                src="/velo-logo.png"
                alt="Velo"
                style={{
                  height: "clamp(3rem, 3rem + 6.5vw, 7.8rem)",
                  width: "auto",
                  display: "inline-block",
                  verticalAlign: "middle",
                  marginBottom: "clamp(2px,0.3vw,4px)",
                }}
              />
            </h1>

            {/* Subtítulo */}
            <p style={{ ...fadeUp(160), fontSize:T.heroSub,
              color:"hsl(240 4% 52%)", lineHeight:1.65,
              margin: `0 0 clamp(1.5rem,3vw,2.5rem)` }}>
              Tudo que você precisa saber sobre o Velo — guias, integrações,
              configurações e referências técnicas em um só lugar.
            </p>

            {/* CTAs */}
            <div className="velo-actions" style={fadeUp(240)}>
              <Link to="/docs" className="velo-btn-a"
                style={{ display:"flex", alignItems:"center",
                  gap:"clamp(.4rem,.7vw,.55rem)",
                  padding: "clamp(.6rem,1vw,.8rem) clamp(1.2rem,2.5vw,1.75rem)",
                  borderRadius:"clamp(10px,1.2vw,14px)",
                  background:"var(--brand-gradient)", color:"#fff",
                  fontSize:T.btnText, fontWeight:600, textDecoration:"none",
                  boxShadow:"0 4px 20px rgba(91,33,182,.3)" }}>
                Começar a ler
                <ArrowRight style={{ width:"clamp(14px,1.2vw,18px)", height:"clamp(14px,1.2vw,18px)" }} />
              </Link>
            </div>

            {/* Stats */}
            <div style={{ ...fadeUp(320),
              display:"flex", justifyContent:"center", flexWrap:"wrap",
              gap: "clamp(1.5rem,4vw,3rem)",
              marginTop: "clamp(2rem,4vw,3.5rem)" }}>
              {[
                { v: rootModules.length || "—", l: "Módulos" },
                { v: totalPages          || "—", l: "Páginas" },
              ].map(({ v, l }) => (
                <div key={l} style={{ textAlign:"center" }}>
                  <div className="brand-text"
                    style={{ fontSize:T.statValue, fontWeight:900, letterSpacing:"-.02em", lineHeight:1 }}>
                    {v}
                  </div>
                  <div style={{ fontSize:T.statLabel, color:"hsl(240 4% 38%)",
                    marginTop:"clamp(.2rem,.4vw,.3rem)", letterSpacing:".05em", textTransform:"uppercase" }}>
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Divisória ── */}
          <div aria-hidden style={{ width:"100%", maxWidth:"clamp(300px,80vw,900px)",
            height:".5px", marginBottom:"clamp(2rem,4vw,4rem)",
            background:"linear-gradient(90deg,transparent,hsl(240 5% 20%),transparent)" }} />

          {/* ── Módulos ── */}
          {rootModules.length > 0 && (
            <section style={{ width:"100%", maxWidth:"clamp(300px,80vw,920px)" }}>

              {/* Label da seção */}
              <p style={{ fontSize:T.sectionLbl, fontWeight:700,
                letterSpacing:".14em", textTransform:"uppercase",
                color:"hsl(240 4% 38%)",
                marginBottom:"clamp(.75rem,1.5vw,1.25rem)",
                display:"flex", alignItems:"center",
                gap:"clamp(.5rem,1vw,.75rem)" }}>
                Módulos de documentação
                <span aria-hidden style={{ flex:1, height:".5px",
                  background:"hsl(240 5% 17%)" }} />
              </p>

              {/* Grid de cards */}
              <div className="velo-modules-grid" style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(clamp(220px,30vw,300px), 1fr))",
                gap:"clamp(.5rem,1vw,.8rem)" }}>
                {rootModules.map((mod) => {
                  const fp = getFirstPage(mod.id);
                  const pc = getPageCount(mod.id);
                  const href = fp
                    ? `/docs/${(mod as any).slug}/${fp.slug}`
                    : `/docs`;
                  return (
                    <Link key={mod.id} to={href} className="velo-card"
                      style={{ display:"flex", alignItems:"center",
                        gap:"clamp(.75rem,1.5vw,1rem)",
                        padding:"clamp(.75rem,1.5vw,1.1rem) clamp(.9rem,1.8vw,1.25rem)",
                        borderRadius:"clamp(12px,1.5vw,18px)",
                        border:"1px solid hsl(240 5% 16%)",
                        background:"hsl(240 5% 10% / .7)",
                        textDecoration:"none", color:"inherit" }}>
                      {/* Ícone */}
                      <div style={{
                        width:"clamp(36px,3.5vw,48px)", height:"clamp(36px,3.5vw,48px)",
                        borderRadius:"clamp(9px,1vw,13px)",
                        background:"var(--brand-gradient)",
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <BookOpen style={{ width:"clamp(16px,1.5vw,22px)", height:"clamp(16px,1.5vw,22px)", color:"#fff" }} />
                      </div>
                      {/* Texto */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:T.cardTitle, fontWeight:600,
                          color:"hsl(0 0% 90%)", marginBottom:".2rem",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {(mod as any).title}
                        </p>
                        {(mod as any).description && (
                          <p style={{ fontSize:T.cardDesc, color:"hsl(240 4% 50%)",
                            marginBottom:".35rem",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {(mod as any).description}
                          </p>
                        )}
                        <p style={{ display:"flex", alignItems:"center",
                          gap:".3rem", fontSize:T.cardMeta, color:"hsl(240 4% 40%)" }}>
                          <FileText style={{ width:"clamp(10px,.9vw,13px)", height:"clamp(10px,.9vw,13px)" }} />
                          {pc} página{pc !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {/* Seta */}
                      <ChevronRight className="velo-arrow"
                        style={{ width:"clamp(14px,1.2vw,18px)", height:"clamp(14px,1.2vw,18px)",
                          flexShrink:0, color:"hsl(240 4% 35%)" }} />
                    </Link>
                  );
                })}
              </div>

              {/* Feature strip */}
              <div className="velo-feats" style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(clamp(140px,20vw,200px), 1fr))",
                marginTop:"clamp(1.5rem,3vw,2.5rem)",
                border:"1px solid hsl(240 5% 15%)",
                borderRadius:"clamp(12px,1.5vw,18px)",
                overflow:"hidden", gap:1,
                background:"hsl(240 5% 15%)" }}>
                {[
                  { Icon:Search,       bg:"rgba(139,92,246,.18)", c:"#a78bfa", t:"Busca rápida",    d:"Ctrl K em qualquer lugar" },
                  { Icon:FileText,     bg:"rgba(20,184,166,.14)", c:"#2dd4bf", t:"Sempre atualizado",d:"Conteúdo revisado em tempo real" },
                  { Icon:BookOpen,     bg:"rgba(236,72,153,.14)", c:"#f472b6", t:"Estruturado",     d:"Módulos e submódulos claros" },
                ].map(({ Icon, bg, c, t, d }) => (
                  <div key={t} className="velo-feat"
                    style={{ background:"hsl(240 5% 10%)",
                      padding:"clamp(.9rem,1.8vw,1.4rem) clamp(.75rem,1.5vw,1.1rem)" }}>
                    <div style={{ width:"clamp(28px,2.8vw,38px)", height:"clamp(28px,2.8vw,38px)",
                      borderRadius:"clamp(7px,.8vw,11px)",
                      background:bg, color:c,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      marginBottom:"clamp(.5rem,.9vw,.75rem)" }}>
                      <Icon style={{ width:"clamp(13px,1.2vw,17px)", height:"clamp(13px,1.2vw,17px)" }} />
                    </div>
                    <p style={{ fontSize:T.featTitle, fontWeight:500,
                      color:"hsl(0 0% 88%)", marginBottom:".2rem" }}>{t}</p>
                    <p style={{ fontSize:T.featDesc, color:"hsl(240 4% 42%)", lineHeight:1.45 }}>{d}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Estado vazio */}
          {modules && modules.length === 0 && (
            <div style={{ textAlign:"center",
              padding:"clamp(3rem,6vw,5rem) 0",
              border:"1px dashed hsl(240 5% 20%)",
              borderRadius:"clamp(12px,1.5vw,18px)",
              color:"hsl(240 4% 40%)", width:"100%", maxWidth:"28rem" }}>
              <BookOpen style={{ width:"clamp(28px,3vw,42px)", height:"clamp(28px,3vw,42px)",
                margin:"0 auto clamp(.6rem,1vw,.9rem)", opacity:.3 }} />
              <p style={{ fontSize:T.cardTitle }}>Nenhum módulo publicado ainda.</p>
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer style={{ position:"relative", zIndex:1, textAlign:"center",
          fontSize:T.footer, color:"hsl(240 4% 33%)",
          padding: "clamp(1rem,2vw,1.5rem) clamp(.75rem,2vw,1.5rem)",
          borderTop:"1px solid hsl(240 5% 14%)" }}>
          © {new Date().getFullYear()} Velo · Documentação oficial
        </footer>

        <SearchModal open={open} query={query} onQueryChange={setQuery} onClose={handleClose} />
      </div>
    </>
  );
}
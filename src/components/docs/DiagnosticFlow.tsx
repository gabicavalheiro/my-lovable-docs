import { useState, useCallback, useRef } from "react";
import { ArrowLeft, RotateCcw, ChevronRight } from "lucide-react";

/* ── Tipos ── */
export interface DiagnosticOption { id: string; label: string; nextStepId: string; }
export interface DiagnosticStep {
  id: string;
  type: "question" | "guide" | "end";
  title: string;
  content?: string;
  badge?: { type: "warning" | "tip" | "important"; text: string };
  options?: DiagnosticOption[];
}
export interface DiagnosticData { title: string; subtitle: string; steps: DiagnosticStep[]; }

/* ── Brand colors — mesmos do sistema ── */
const GRADIENT = "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)";
const PURPLE   = "#5b21b6";
const ORANGE   = "#ff6b00";

/* ── Cores idle dos botões de opção (brand purple, não indigo/azul) ── */
const BTN_IDLE = {
  background:   "rgba(91,33,182,0.06)",
  borderColor:  "rgba(91,33,182,0.22)",
  color:        "var(--foreground)",
};
const BTN_HOVER = {
  background:  GRADIENT,
  borderColor: "transparent",
  color:       "#fff",
};

function parseGuideContent(content: string) {
  return content.split("\n")
    .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function StepBadge({ badge }: { badge: NonNullable<DiagnosticStep["badge"]> }) {
  const styles: Record<string, { bg: string; border: string; color: string; label: string }> = {
    warning:   { bg: "rgba(239,68,68,0.08)",  border: "#ef4444", color: "#991b1b", label: "⚠️ Atenção" },
    important: { bg: "rgba(220,38,38,0.08)",  border: "#dc2626", color: "#7f1d1d", label: "🚨 Importante" },
    tip:       { bg: "rgba(91,33,182,0.07)",  border: PURPLE,    color: PURPLE,    label: "💡 Dica" },
  };
  const s = styles[badge.type] ?? styles.tip;
  return (
    <div style={{ background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: "0 10px 10px 0", padding: "12px 16px", marginTop: 16, fontSize: "0.88rem", lineHeight: 1.6, color: s.color }}>
      <strong style={{ display: "block", marginBottom: 4 }}>{s.label}</strong>
      {badge.text}
    </div>
  );
}

export function DiagnosticFlow({ data }: { data: DiagnosticData }) {
  const stepMap = new Map(data.steps.map(s => [s.id, s]));
  const startId = data.steps[0]?.id ?? "";

  const [history, setHistory] = useState<string[]>([startId]);
  const [animKey, setAnimKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentId = history[history.length - 1];
  const current   = stepMap.get(currentId) ?? data.steps[0];
  const canGoBack = history.length > 1;

  const go = useCallback((nextId: string) => {
    setHistory(h => [...h, nextId]);
    setAnimKey(k => k + 1);
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }, []);

  const back = useCallback(() => {
    setHistory(h => h.slice(0, -1));
    setAnimKey(k => k + 1);
  }, []);

  const reset = useCallback(() => {
    setHistory([startId]);
    setAnimKey(k => k + 1);
  }, [startId]);

  /* Breadcrumb */
  const breadcrumb = history.map(id => stepMap.get(id)?.title ?? "").filter(Boolean);

  return (
    <div ref={cardRef} style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(91,33,182,0.15)", boxShadow: "0 4px 24px rgba(91,33,182,0.10)" }}>

      {/* Header com gradiente do sistema */}
      <div style={{ background: GRADIENT, padding: "20px 28px 18px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "inline-block" }} />
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>Diagnóstico</span>
        </div>
        <p style={{ fontWeight: 800, fontSize: "1.18rem", color: "#fff", margin: 0, lineHeight: 1.3 }}>{data.title}</p>

        {/* Breadcrumb */}
        {breadcrumb.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem" }}>{crumb}</span>
                {i < breadcrumb.length - 1 && <ChevronRight style={{ color: "rgba(255,255,255,0.4)" }} className="h-3 w-3" />}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo animado */}
      <div key={animKey} style={{ padding: "24px 28px 26px", animation: "diagFade 0.25s ease forwards", background: "var(--background)" }}>

        {/* ── PERGUNTA ── */}
        {current.type === "question" && (
          <div>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 20, lineHeight: 1.4 }}>
              {current.title}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {current.options?.map(opt => (
                <button key={opt.id} onClick={() => go(opt.nextStepId)}
                  style={{ ...BTN_IDLE, border: `1.5px solid ${BTN_IDLE.borderColor}`, borderRadius: 12, padding: "14px 18px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.18s" }}
                  onMouseEnter={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = BTN_HOVER.background;
                    b.style.borderColor = BTN_HOVER.borderColor;
                    b.style.color = BTN_HOVER.color;
                    b.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={e => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.background = BTN_IDLE.background;
                    b.style.borderColor = BTN_IDLE.borderColor;
                    b.style.color = "var(--foreground)";
                    b.style.transform = "none";
                  }}>
                  <span>{opt.label}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: ORANGE }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── GUIA ── */}
        {current.type === "guide" && (
          <div>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 18, lineHeight: 1.4 }}>
              {current.title}
            </p>
            {current.content && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {parseGuideContent(current.content).map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 800, fontSize: "0.82rem" }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: "0.94rem", lineHeight: 1.65, color: "var(--muted-foreground)", paddingTop: 4, margin: 0 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}
            {current.badge && <StepBadge badge={current.badge} />}
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
              {canGoBack && (
                <button onClick={back}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--muted-foreground)", fontSize: "0.87rem", fontWeight: 600, cursor: "pointer" }}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              )}
              <button onClick={reset}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "rgba(91,33,182,0.08)", color: PURPLE, fontSize: "0.87rem", fontWeight: 600, cursor: "pointer" }}>
                <RotateCcw className="h-3.5 w-3.5" /> Começar novamente
              </button>
            </div>
          </div>
        )}

        {/* ── END ── */}
        {current.type === "end" && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>{current.title}</p>
            {current.content && <p style={{ color: "var(--muted-foreground)", lineHeight: 1.7, fontSize: "0.94rem" }}>{current.content}</p>}
            <button onClick={reset}
              style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: GRADIENT, color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
              <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes diagFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
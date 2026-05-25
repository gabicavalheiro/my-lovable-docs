import { useState, useCallback, useRef } from "react";
import { ArrowLeft, RotateCcw, ChevronRight } from "lucide-react";

/* ── Tipos ──────────────────────────────────────────────────────────────────── */
export interface DiagnosticOption { id: string; label: string; nextStepId: string; }
export interface DiagnosticStep {
  id: string;
  type: "question" | "guide" | "end";
  title: string;
  content?: string;          // texto de guia com passos (separados por \n)
  badge?: { type: "warning" | "tip" | "important"; text: string };
  options?: DiagnosticOption[];
}
export interface DiagnosticData { title: string; subtitle: string; steps: DiagnosticStep[]; }

/* ── Brand ──────────────────────────────────────────────────────────────────── */
const GRADIENT  = "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)";
const PURPLE    = "#5b21b6";
const ORANGE    = "#ff6b00";

/* ── Parsing de conteúdo guia → passos numerados ─────────────────────────────── */
function parseGuideContent(content: string) {
  return content
    .split("\n")
    .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

/* ── Badge ──────────────────────────────────────────────────────────────────── */
function StepBadge({ badge }: { badge: NonNullable<DiagnosticStep["badge"]> }) {
  const styles: Record<string, { bg: string; border: string; color: string; label: string }> = {
    warning:   { bg: "#fff5f5", border: "#ef4444", color: "#991b1b", label: "⚠️ Atenção" },
    important: { bg: "#fff5f5", border: "#dc2626", color: "#7f1d1d", label: "🚨 Importante" },
    tip:       { bg: "#f5f3ff", border: PURPLE,    color: "#5b21b6", label: "💡 Dica" },
  };
  const s = styles[badge.type] ?? styles.tip;
  return (
    <div style={{ background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: "0 10px 10px 0", padding: "12px 16px", marginTop: 16, fontSize: "0.88rem", lineHeight: 1.6, color: s.color }}>
      <strong style={{ display: "block", marginBottom: 4 }}>{s.label}</strong>
      {badge.text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════════════ */
export function DiagnosticFlow({ data }: { data: DiagnosticData }) {
  const stepMap = new Map(data.steps.map(s => [s.id, s]));
  const startId = data.steps[0]?.id ?? "";

  const [history, setHistory] = useState<string[]>([startId]);
  const [animKey, setAnimKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentId = history[history.length - 1];
  const current   = stepMap.get(currentId) ?? data.steps[0];

  const go = useCallback((nextId: string) => {
    setHistory(h => [...h, nextId]);
    setAnimKey(k => k + 1);
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const back = useCallback(() => {
    if (history.length <= 1) return;
    setHistory(h => h.slice(0, -1));
    setAnimKey(k => k + 1);
  }, [history]);

  const reset = useCallback(() => {
    setHistory([startId]);
    setAnimKey(k => k + 1);
  }, [startId]);

  const canGoBack = history.length > 1;

  /* ── Breadcrumb de caminho ── */
  const breadcrumb = history
    .slice(0, -1)
    .map(id => stepMap.get(id)?.title?.slice(0, 28) + (stepMap.get(id)?.title && stepMap.get(id)!.title.length > 28 ? "…" : ""))
    .filter(Boolean);

  return (
    <div ref={cardRef} style={{ fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      {/* Card */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 16px 40px rgba(0,0,0,0.10)", overflow: "hidden" }}>

        {/* Header gradiente */}
        <div style={{ background: GRADIENT, padding: "20px 28px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                🔍 Diagnóstico
              </p>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.25rem", margin: 0 }}>{data.title}</h2>
            </div>
            {canGoBack && (
              <button onClick={back}
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.28)"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.18)"}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          {breadcrumb.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
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
        <div key={animKey} style={{ padding: "24px 28px 26px", animation: "diagFade 0.3s ease forwards" }}>

          {/* ── PERGUNTA ── */}
          {current.type === "question" && (
            <div>
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e1b4b", marginBottom: 20, lineHeight: 1.4 }}>
                {current.title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {current.options?.map(opt => (
                  <button key={opt.id} onClick={() => go(opt.nextStepId)}
                    style={{ background: "#f8f7ff", border: "2px solid #e5e3f7", borderRadius: 12, padding: "14px 18px", fontSize: "0.96rem", fontWeight: 600, cursor: "pointer", textAlign: "left", color: "#3730a3", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.18s" }}
                    onMouseEnter={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = GRADIENT; b.style.borderColor = "transparent";
                      b.style.color = "#fff"; b.style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = "#f8f7ff"; b.style.borderColor = "#e5e3f7";
                      b.style.color = "#3730a3"; b.style.transform = "none";
                    }}
                  >
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
              <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e1b4b", marginBottom: 18, lineHeight: 1.4 }}>
                {current.title}
              </p>

              {/* Passos numerados */}
              {current.content && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {parseGuideContent(current.content).map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      {/* Número com gradiente */}
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontWeight: 800, fontSize: "0.82rem" }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize: "0.94rem", lineHeight: 1.65, color: "#374151", paddingTop: 4, margin: 0 }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Badge */}
              {current.badge && <StepBadge badge={current.badge} />}

              {/* Botão reiniciar */}
              <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #f1f1f1", display: "flex", gap: 10 }}>
                {canGoBack && (
                  <button onClick={back}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", color: "#6b7280", fontSize: "0.87rem", fontWeight: 600, cursor: "pointer" }}>
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
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e1b4b", marginBottom: 8 }}>{current.title}</p>
              {current.content && <p style={{ color: "#6b7280", lineHeight: 1.7, fontSize: "0.94rem" }}>{current.content}</p>}
              <button onClick={reset} style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, border: "none", background: GRADIENT, color: "#fff", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes diagFade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

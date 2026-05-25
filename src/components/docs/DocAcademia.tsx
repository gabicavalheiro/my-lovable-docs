import { useState, useCallback, useRef } from "react";

/* ── Tipos ────────────────────────────────────────────────────────────────── */
interface AcademiaOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
  nextStepId: string;
}
interface AcademiaStep {
  id: string;
  type: "intro" | "quiz" | "end";
  content: string;
  badge?: { type: "warning" | "tip"; text: string };
  options?: AcademiaOption[];
  nextStepId?: string;
}
interface AcademiaData {
  title: string;
  subtitle: string;
  steps: AcademiaStep[];
}

/* ── Brand colors Velo ────────────────────────────────────────────────────── */
const GRADIENT  = "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)";
const PURPLE    = "#311068";
const ACCENT    = "#ff6b00";
const PRIMARY   = "#4f46e5";

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function getProgress(steps: AcademiaStep[], id: string) {
  const idx = steps.findIndex(s => s.id === id);
  return idx < 0 ? 0 : Math.round(((idx + 1) / steps.length) * 100);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════════════ */
export function DocAcademia({ data }: { data: AcademiaData }) {
  const { steps } = data;
  const [currentId, setCurrentId]       = useState(steps[0]?.id ?? "intro");
  const [selected, setSelected]         = useState<AcademiaOption | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore]               = useState({ correct: 0, total: 0 });
  const [answered, setAnswered]         = useState<Record<string, boolean>>({});
  const [animKey, setAnimKey]           = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const current   = steps.find(s => s.id === currentId) ?? steps[0];
  const progress  = getProgress(steps, currentId);
  const quizTotal = steps.filter(s => s.type === "quiz").length;
  const quizIndex = steps.filter(s => s.type === "quiz").findIndex(s => s.id === currentId) + 1;

  const go = useCallback((id: string) => {
    setCurrentId(id);
    setSelected(null);
    setShowFeedback(false);
    setAnimKey(k => k + 1);
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const pick = useCallback((opt: AcademiaOption) => {
    if (showFeedback) return;
    setSelected(opt);
    setShowFeedback(true);
    if (!answered[currentId]) {
      setAnswered(p => ({ ...p, [currentId]: true }));
      setScore(p => ({ correct: p.correct + (opt.isCorrect ? 1 : 0), total: p.total + 1 }));
    }
  }, [showFeedback, currentId, answered]);

  const reset = useCallback(() => {
    setCurrentId(steps[0]?.id ?? "intro");
    setSelected(null);
    setShowFeedback(false);
    setScore({ correct: 0, total: 0 });
    setAnswered({});
    setAnimKey(k => k + 1);
  }, [steps]);

  const pct   = quizTotal > 0 ? Math.round((score.correct / quizTotal) * 100) : 0;
  const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚";
  const label = pct >= 80 ? "Excelente domínio!" : pct >= 60 ? "Bom progresso!" : "Continue praticando!";

  return (
    <div ref={cardRef} style={{ fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      {/* Card */}
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 16px 40px rgba(0,0,0,0.10)", overflow: "hidden", position: "relative" }}>

        {/* Barra de progresso */}
        <div style={{ height: 6, background: GRADIENT, width: `${progress}%`, transition: "width 0.5s ease" }} />

        <div style={{ padding: "28px 32px 24px" }}>
          {/* Header */}
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 2 }}>
            {data.title}
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24, fontWeight: 500 }}>{data.subtitle}</p>

          {/* Step animado */}
          <div key={animKey} style={{ animation: "fadeUp 0.35s ease forwards" }}>

            {/* ── INTRO ── */}
            {current.type === "intro" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 14 }}>🎓</div>
                <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "#334155", maxWidth: 520, margin: "0 auto 24px" }}>
                  {current.content}
                </p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "8px 16px", marginBottom: 24, color: "#5b21b6", fontSize: "0.88rem", fontWeight: 600 }}>
                  📋 {quizTotal} perguntas de múltipla escolha
                </div>
                <br />
                <PrimaryBtn onClick={() => go(current.nextStepId ?? steps[1]?.id)}>
                  Começar Academia ➔
                </PrimaryBtn>
              </div>
            )}

            {/* ── QUIZ ── */}
            {current.type === "quiz" && (
              <div>
                <p style={{ fontSize: "1.2rem", fontWeight: 700, color: PURPLE, lineHeight: 1.5, marginBottom: 22 }}>
                  {current.content}
                </p>

                {/* Opções */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
                  {current.options?.map(opt => {
                    let bg = "#f8fafc", border = "2px solid #e2e8f0", color = PURPLE;
                    if (showFeedback) {
                      if (opt.id === selected?.id) {
                        bg     = opt.isCorrect ? "#f0fdf4" : "#fff5f5";
                        border = `2px solid ${opt.isCorrect ? "#86efac" : "#fca5a5"}`;
                        color  = opt.isCorrect ? "#166534" : "#991b1b";
                      } else if (opt.isCorrect) {
                        bg = "#f0fdf4"; border = "2px solid #86efac"; color = "#166534";
                      }
                    }
                    return (
                      <button key={opt.id} onClick={() => pick(opt)} disabled={showFeedback}
                        style={{ background: bg, border, padding: "14px 18px", borderRadius: 12, fontSize: "0.98rem", fontWeight: 600, cursor: showFeedback ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", color, transition: "all 0.2s" }}
                        onMouseEnter={e => { if (!showFeedback) { const b = e.currentTarget as HTMLButtonElement; b.style.background = GRADIENT; b.style.borderColor = "transparent"; b.style.color = "#fff"; b.style.transform = "translateY(-2px)"; } }}
                        onMouseLeave={e => { if (!showFeedback) { const b = e.currentTarget as HTMLButtonElement; b.style.background = bg; b.style.borderColor = "#e2e8f0"; b.style.color = PURPLE; b.style.transform = "none"; } }}
                      >
                        <span>{opt.text}</span>
                        {showFeedback && opt.id === selected?.id
                          ? <span style={{ fontSize: "1.1rem" }}>{opt.isCorrect ? "✅" : "❌"}</span>
                          : !showFeedback && <span style={{ color: ACCENT }}>➔</span>
                        }
                      </button>
                    );
                  })}
                </div>

                {/* Feedback */}
                {showFeedback && selected && (
                  <div style={{ background: selected.isCorrect ? "#f0fdf4" : "#fff5f5", border: `1px solid ${selected.isCorrect ? "#86efac" : "#fca5a5"}`, borderLeft: `5px solid ${selected.isCorrect ? "#22c55e" : "#ef4444"}`, borderRadius: "0 12px 12px 0", padding: "14px 18px", marginBottom: 16, fontSize: "0.93rem", lineHeight: 1.6, color: selected.isCorrect ? "#166534" : "#991b1b", animation: "fadeUp 0.25s ease forwards" }}>
                    {selected.feedback}
                  </div>
                )}

                {/* Badge */}
                {current.badge && <Badge type={current.badge.type} text={current.badge.text} />}

                {/* Próxima */}
                {showFeedback && selected && (
                  <PrimaryBtn onClick={() => go(selected.nextStepId)} style={{ width: "100%", marginTop: 6 }}>
                    {selected.nextStepId === "end" ? "Ver resultado ➔" : "Próxima pergunta ➔"}
                  </PrimaryBtn>
                )}
              </div>
            )}

            {/* ── END ── */}
            {current.type === "end" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: 10 }}>{emoji}</div>

                <div style={{ display: "inline-block", background: GRADIENT, borderRadius: 99, padding: "8px 28px", color: "#fff", fontWeight: 800, fontSize: "1.4rem", marginBottom: 10 }}>
                  {score.correct}/{quizTotal}
                </div>

                <p style={{ fontWeight: 700, fontSize: "1.1rem", color: PURPLE, marginBottom: 6 }}>
                  {label} — {pct}% de acertos
                </p>

                <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, margin: "14px 0 22px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: GRADIENT, borderRadius: 99, transition: "width 0.9s ease" }} />
                </div>

                <p style={{ color: "#475569", lineHeight: 1.7, fontSize: "0.96rem", maxWidth: 500, margin: "0 auto 24px" }}>
                  {current.content}
                </p>

                <button onClick={reset}
                  style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.93rem", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = ACCENT}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#64748b"}
                >
                  🔄 Reiniciar Academia
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contador de perguntas */}
      {current.type === "quiz" && (
        <div style={{ textAlign: "center", marginTop: 10, color: "#94a3b8", fontSize: "0.8rem" }}>
          Pergunta {quizIndex} de {quizTotal}
          {score.total > 0 && (
            <span style={{ marginLeft: 14, color: PRIMARY, fontWeight: 600 }}>
              ✓ {score.correct}/{score.total} corretas
            </span>
          )}
        </div>
      )}

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ── Primitivos ───────────────────────────────────────────────────────────── */
function PrimaryBtn({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick}
      style={{ background: GRADIENT, color: "#fff", border: "none", padding: "14px 24px", borderRadius: 13, fontSize: "1rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s, transform 0.2s", ...style }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "0.9"; b.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.opacity = "1"; b.style.transform = "none"; }}
    >
      {children}
    </button>
  );
}

function Badge({ type, text }: { type: "warning" | "tip"; text: string }) {
  const warn = type === "warning";
  return (
    <div style={{ background: warn ? "#fff5f5" : "#f5f3ff", border: `1px solid ${warn ? "#fecaca" : "#ddd6fe"}`, borderLeft: `5px solid ${warn ? "#ef4444" : PRIMARY}`, borderRadius: "0 10px 10px 0", padding: "12px 16px", marginBottom: 14, fontSize: "0.88rem", lineHeight: 1.6, color: warn ? "#991b1b" : "#5b21b6" }}>
      <strong style={{ display: "block", marginBottom: 3 }}>{warn ? "⚠️ Atenção:" : "💡 Dica:"}</strong>
      {text}
    </div>
  );
}
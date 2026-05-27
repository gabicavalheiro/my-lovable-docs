import { useState, useCallback, useRef, useEffect } from "react";
import { salvarAtividade } from "@/hooks/useSalvarAtividade";

interface AcademiaOption { id: string; text: string; isCorrect: boolean; feedback: string; nextStepId: string; }
interface AcademiaStep  { id: string; type: "intro" | "quiz" | "end"; content: string; badge?: { type: "warning" | "tip"; text: string }; options?: AcademiaOption[]; nextStepId?: string; }
interface AcademiaData  { title: string; subtitle: string; steps: AcademiaStep[]; }

const G  = "linear-gradient(135deg, #5b21b6 0%, #ff6b00 100%)";
const G2 = "linear-gradient(135deg, rgba(91,33,182,0.18) 0%, rgba(255,107,0,0.12) 100%)";

function getProgress(steps: AcademiaStep[], id: string) {
  const idx = steps.findIndex(s => s.id === id);
  return idx < 0 ? 0 : Math.round(((idx + 1) / steps.length) * 100);
}

/* ── Glass option button ── */
function Option({ opt, showFeedback, selected, onPick }: {
  opt: AcademiaOption; showFeedback: boolean;
  selected: AcademiaOption | null; onPick: (o: AcademiaOption) => void;
}) {
  const isSelected = opt.id === selected?.id;
  const isCorrect  = opt.isCorrect;

  let bg      = "rgba(255,255,255,0.05)";
  let border  = "1px solid rgba(255,255,255,0.1)";
  let color   = "var(--foreground)";
  let icon    = null as React.ReactNode;

  if (showFeedback) {
    if (isSelected && isCorrect)  { bg = "rgba(34,197,94,0.12)";  border = "1px solid rgba(34,197,94,0.4)";  color = "#4ade80"; icon = "✅"; }
    if (isSelected && !isCorrect) { bg = "rgba(239,68,68,0.12)";  border = "1px solid rgba(239,68,68,0.4)";  color = "#f87171"; icon = "❌"; }
    if (!isSelected && isCorrect) { bg = "rgba(34,197,94,0.08)";  border = "1px solid rgba(34,197,94,0.3)";  color = "#4ade80"; }
  }

  return (
    <button
      onClick={() => onPick(opt)}
      disabled={showFeedback}
      style={{ background: bg, border, borderRadius: 12, padding: "14px 18px", fontSize: "0.95rem", fontWeight: 500, cursor: showFeedback ? "default" : "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, color, transition: "all 0.2s", width: "100%", backdropFilter: "blur(8px)" }}
      onMouseEnter={e => { if (!showFeedback) { const b = e.currentTarget; b.style.background = "rgba(91,33,182,0.25)"; b.style.borderColor = "rgba(91,33,182,0.5)"; b.style.transform = "translateX(4px)"; } }}
      onMouseLeave={e => { if (!showFeedback) { const b = e.currentTarget; b.style.background = bg; b.style.borderColor = "rgba(255,255,255,0.1)"; b.style.transform = "none"; } }}
    >
      <span style={{ flex: 1 }}>{opt.text}</span>
      {showFeedback && icon
        ? <span style={{ fontSize: "1rem", flexShrink: 0 }}>{icon}</span>
        : !showFeedback && <span style={{ color: "#ff6b00", flexShrink: 0, fontSize: "1rem" }}>→</span>
      }
    </button>
  );
}

export function DocAcademia({ data }: { data: AcademiaData }) {
  const { steps } = data;
  const [currentId, setCurrentId]       = useState(steps[0]?.id ?? "intro");
  const [selected, setSelected]         = useState<AcademiaOption | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore]               = useState({ correct: 0, total: 0 });
  const [answered, setAnswered]         = useState<Record<string, boolean>>({});
  const [animKey, setAnimKey]           = useState(0);
  const cardRef  = useRef<HTMLDivElement>(null);
  const startRef = useRef<number>(Date.now());

  const current   = steps.find(s => s.id === currentId) ?? steps[0];
  const progress  = getProgress(steps, currentId);
  const quizTotal = steps.filter(s => s.type === "quiz").length;
  const quizIndex = steps.filter(s => s.type === "quiz").findIndex(s => s.id === currentId) + 1;

  const go = useCallback((id: string) => {
    setCurrentId(id); setSelected(null); setShowFeedback(false); setAnimKey(k => k + 1);
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const pick = useCallback((opt: AcademiaOption) => {
    if (showFeedback) return;
    setSelected(opt); setShowFeedback(true);
    if (!answered[currentId]) {
      setAnswered(p => ({ ...p, [currentId]: true }));
      setScore(p => ({ correct: p.correct + (opt.isCorrect ? 1 : 0), total: p.total + 1 }));
    }
  }, [showFeedback, currentId, answered]);

  const reset = useCallback(() => {
    startRef.current = Date.now();
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

  // Salva quando chega na tela final
  useEffect(() => {
    if (current.type !== "end") return;
    const duracao_seg = Math.round((Date.now() - startRef.current) / 1000);
    salvarAtividade({
      tipo:        "academia",
      page_id:     data.title,
      page_title:  data.title,
      score_pct:   pct,
      acertos:     score.correct,
      total:       quizTotal,
      duracao_seg,
    });
  }, [current.type]); // eslint-disable-line

  return (
    <div ref={cardRef}>
      {/* Card glass */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>

        {/* Barra de progresso */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ height: "100%", background: G, width: `${progress}%`, transition: "width 0.6s cubic-bezier(.4,0,.2,1)", borderRadius: "0 4px 4px 0" }} />
        </div>

        {/* Header */}
        <div style={{ background: G2, borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 28px 18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0, lineHeight: 1.3 }}>
                {data.title}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", margin: "4px 0 0", fontWeight: 500 }}>{data.subtitle}</p>
            </div>
            {current.type === "quiz" && (
              <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "4px 10px", fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap" }}>
                {quizIndex} / {quizTotal}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo animado */}
        <div key={animKey} style={{ padding: "28px 28px 24px", animation: "glassIn 0.3s ease forwards" }}>

          {/* ── INTRO ── */}
          {current.type === "intro" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", margin: "0 auto 20px" }}>🎓</div>
              <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto 24px" }}>{current.content}</p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(91,33,182,0.15)", border: "1px solid rgba(91,33,182,0.3)", borderRadius: 10, padding: "7px 16px", marginBottom: 28, color: "#a78bfa", fontSize: "0.85rem", fontWeight: 600 }}>
                📋 {quizTotal} perguntas de múltipla escolha
              </div>
              <br />
              <button onClick={() => go(current.nextStepId ?? steps[1]?.id)}
                style={{ background: G, color: "#fff", border: "none", borderRadius: 12, padding: "13px 32px", fontWeight: 700, fontSize: "0.97rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(91,33,182,0.4)" }}>
                Começar Academia →
              </button>
            </div>
          )}

          {/* ── QUIZ ── */}
          {current.type === "quiz" && (
            <div>
              <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.55, marginBottom: 20 }}>
                {current.content}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {current.options?.map(opt => (
                  <Option key={opt.id} opt={opt} showFeedback={showFeedback} selected={selected} onPick={pick} />
                ))}
              </div>

              {showFeedback && selected && (
                <div style={{
                  background: selected.isCorrect ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                  border: `1px solid ${selected.isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  borderLeft: `4px solid ${selected.isCorrect ? "#22c55e" : "#ef4444"}`,
                  borderRadius: "0 12px 12px 0",
                  padding: "13px 16px", marginBottom: 16, fontSize: "0.9rem", lineHeight: 1.65,
                  color: selected.isCorrect ? "#4ade80" : "#f87171",
                  animation: "glassIn 0.25s ease forwards",
                }}>
                  {selected.feedback}
                </div>
              )}

              {current.badge && (
                <div style={{
                  background: current.badge.type === "warning" ? "rgba(239,68,68,0.08)" : "rgba(91,33,182,0.08)",
                  border: `1px solid ${current.badge.type === "warning" ? "rgba(239,68,68,0.25)" : "rgba(91,33,182,0.25)"}`,
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16,
                  fontSize: "0.85rem", color: current.badge.type === "warning" ? "#f87171" : "#a78bfa",
                }}>
                  {current.badge.type === "warning" ? "⚠️" : "💡"} {current.badge.text}
                </div>
              )}

              {showFeedback && selected && (
                <button onClick={() => go(selected.nextStepId)}
                  style={{ background: G, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: "0.93rem", cursor: "pointer", width: "100%", boxShadow: "0 4px 16px rgba(91,33,182,0.35)" }}>
                  {selected.nextStepId === "end" ? "Ver resultado →" : "Próxima pergunta →"}
                </button>
              )}
            </div>
          )}

          {/* ── END ── */}
          {current.type === "end" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 16px", boxShadow: "0 0 40px rgba(91,33,182,0.5)" }}>
                {emoji}
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 900, background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1, marginBottom: 4 }}>
                {pct}%
              </div>
              <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.95rem", marginBottom: 8 }}>{label}</p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: 6 }}>
                {score.correct} de {quizTotal} respostas corretas
              </p>
              {current.content && (
                <p style={{ color: "var(--muted-foreground)", lineHeight: 1.7, fontSize: "0.9rem", maxWidth: 440, margin: "12px auto 20px" }}>{current.content}</p>
              )}
              <button onClick={reset}
                style={{ background: G, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: "0.93rem", cursor: "pointer", boxShadow: "0 4px 20px rgba(91,33,182,0.4)" }}>
                🔄 Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer com progresso de perguntas */}
        {current.type === "quiz" && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "10px 28px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", gap: 5, flex: 1 }}>
              {steps.filter(s => s.type === "quiz").map((s) => (
                <div key={s.id} style={{
                  height: 4, flex: 1, borderRadius: 4,
                  background: answered[s.id]
                    ? (s.id === currentId ? G : "rgba(167,139,250,0.5)")
                    : "rgba(255,255,255,0.08)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, whiteSpace: "nowrap" }}>
              Pergunta {quizIndex} de {quizTotal}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glassIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
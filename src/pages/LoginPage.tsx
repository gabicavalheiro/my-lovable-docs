import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

/* ── Rate limiting (client-side) ────────────────────────────────────────── */
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutos
const RL_KEY        = "__rl";

interface RLState { attempts: number; lockedUntil: number | null; }

function getRLState(): RLState {
  try {
    const raw = localStorage.getItem(RL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { attempts: 0, lockedUntil: null };
}

function setRLState(s: RLState) {
  localStorage.setItem(RL_KEY, JSON.stringify(s));
}

function recordFailure(): RLState {
  const s = getRLState();
  const attempts = s.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
  const next = { attempts, lockedUntil };
  setRLState(next);
  return next;
}

function clearRL() { localStorage.removeItem(RL_KEY); }

function getLockoutRemaining(): number {
  const { lockedUntil } = getRLState();
  if (!lockedUntil) return 0;
  const remaining = lockedUntil - Date.now();
  if (remaining <= 0) { clearRL(); return 0; }
  return remaining;
}

/* ── Componente ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [locked,   setLocked]   = useState(0); // ms restantes

  // Se já autenticado como admin, vai direto pro admin
  useEffect(() => {
    if (isAdmin) navigate("/admin", { replace: true });
  }, [isAdmin, navigate]);

  // Atualiza contagem regressiva do lockout
  useEffect(() => {
    const remaining = getLockoutRemaining();
    if (remaining <= 0) return;
    setLocked(remaining);
    const interval = setInterval(() => {
      const r = getLockoutRemaining();
      setLocked(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const remaining = getLockoutRemaining();
    if (remaining > 0) {
      setLocked(remaining);
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      clearRL();
      // isAdmin será atualizado pelo useAuth → useEffect redireciona
    } catch {
      const rl = recordFailure();
      if (rl.lockedUntil) {
        setLocked(LOCKOUT_MS);
        setError(`Muitas tentativas. Tente novamente em ${Math.ceil(LOCKOUT_MS / 60000)} minutos.`);
      } else {
        const left = MAX_ATTEMPTS - rl.attempts;
        setError(`Credenciais inválidas.${left <= 2 ? ` ${left} tentativa${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}.` : ""}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const lockedMinutes = Math.ceil(locked / 60000);
  const lockedSeconds = Math.ceil((locked % 60000) / 1000);
  const lockLabel = locked > 60000 ? `${lockedMinutes}m` : `${lockedSeconds}s`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/velo-logo.png" alt="Velo" style={{ height: 36, width: "auto" }} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || locked > 0}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || locked > 0}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || locked > 0}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
              </span>
            ) : locked > 0 ? (
              `Bloqueado — aguarde ${lockLabel}`
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
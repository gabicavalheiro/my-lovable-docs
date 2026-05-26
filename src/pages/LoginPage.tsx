import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(
        err.message?.includes("Invalid login credentials")
          ? "Email ou senha inválidos."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 70% at 20% 20%, rgba(91,33,182,0.18) 0%, transparent 60%)," +
          "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,107,0,0.10) 0%, transparent 55%)," +
          "hsl(var(--background))",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/velo-logo.png" alt="Velo" style={{ height: 56, width: "auto" }} />
        </div>

        <h1 className="text-xl font-bold text-foreground text-center mb-1">Área administrativa</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Faça login para gerenciar a documentação
        </p>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-px disabled:opacity-60 disabled:translate-y-0"
              style={{ background: "var(--brand-gradient)" }}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                <><LogIn className="h-4 w-4" /> Entrar</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Velo · Documentação oficial
        </p>
      </div>
    </div>
  );
}
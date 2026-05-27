import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function validateCNPJ(cnpj: string) {
  const digits = cnpj.replace(/\D/g, "");
  return digits.length === 14;
}

export default function ClienteSignupPage() {
  const navigate = useNavigate();

  const [nomeRevenda, setNomeRevenda] = useState("");
  const [cnpj,        setCnpj]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleCNPJ = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCNPJ(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
  
    if (!nomeRevenda.trim()) { setError("Informe o nome da revenda."); return; }
    if (!validateCNPJ(cnpj)) { setError("CNPJ inválido — informe os 14 dígitos."); return; }
    if (password.length < 6)  { setError("A senha deve ter ao menos 6 caracteres."); return; }
  
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_revenda: nomeRevenda.trim(),
            cnpj: cnpj.replace(/\D/g, ""),
          }
        }
      });
      if (signUpError) throw signUpError;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg = err?.message ?? "Erro ao criar conta.";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        setError("Este e-mail já está cadastrado.");
      } else if (msg.includes("cnpj")) {
        setError("Este CNPJ já está cadastrado.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/velo-logo.png" alt="Velo" style={{ height: 36, width: "auto" }} />
        </div>

        <h1 className="text-center text-lg font-semibold text-foreground mb-1">
          Criar conta
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Acesse a documentação e acompanhe seu desempenho
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Nome da revenda"
            value={nomeRevenda}
            onChange={(e) => setNomeRevenda(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            type="text"
            placeholder="CNPJ"
            value={cnpj}
            onChange={handleCNPJ}
            disabled={loading}
            inputMode="numeric"
            required
          />
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
          />
          <Input
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
          />

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Criando conta…
              </span>
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

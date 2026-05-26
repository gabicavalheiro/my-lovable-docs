import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Não autenticado → redireciona para login (sem revelar o path do admin)
  if (!user) return <Navigate to="/_olev-9f3k2" replace />;

  return <>{children}</>;
}
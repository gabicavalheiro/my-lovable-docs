import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

const Index             = lazy(() => import("./pages/Index"));
const DocsIndex         = lazy(() => import("./pages/DocsIndex"));
const DocsPage          = lazy(() => import("./pages/DocsPage"));
const AcademiaIndex     = lazy(() => import("./pages/AcademiaIndex"));
const DiagnosticosIndex = lazy(() => import("./pages/DiagnosticosIndex"));
const AdminPage         = lazy(() => import("./pages/AdminPage"));
const LoginPage         = lazy(() => import("./pages/LoginPage"));
const NotFound          = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-3 w-64">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"                           element={<Index />} />
              <Route path="/docs"                       element={<DocsIndex />} />
              <Route path="/docs/:moduleSlug/:pageSlug" element={<DocsPage />} />
              <Route path="/academia"                   element={<AcademiaIndex />} />
              <Route path="/diagnosticos"               element={<DiagnosticosIndex />} />
              <Route path="/_olev-9f3k2"                element={<LoginPage />} />
              <Route path="/admin"                      element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="*"                           element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
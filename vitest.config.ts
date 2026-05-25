import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Evita instâncias duplicadas de React em monorepos / builds complexos
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },

  // ── Pré-bundle das dependências mais pesadas ────────────────────────────
  // Transforma CJS → ESM uma vez só, acelera o cold start em dev.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "react-markdown",
      "remark-gfm",
      "rehype-raw",
      "lucide-react",
    ],
  },

  build: {
    // ES2020 é suportado por todos os browsers modernos (>92% global)
    target: "es2020",

    // Produção: minificação rápida via esbuild (padrão do Vite 5)
    minify: "esbuild",

    // Avisa quando um chunk ultrapassar 500 KB (indicador de bundle bloat)
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        /**
         * Code splitting manual:
         *
         * react-vendor   → react + react-dom + router  (muda raramente → cache longo)
         * query          → @tanstack/react-query        (muda pouco)
         * supabase       → @supabase/supabase-js        (muda pouco)
         * markdown       → react-markdown + plugins     (lazy-loadable)
         * ui-vendor      → radix-ui + lucide             (muda pouco)
         *
         * O app principal fica menor, aumenta o cache hit rate em produção.
         */
        manualChunks(id) {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router-dom/") ||
            id.includes("node_modules/react-router/")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("node_modules/@tanstack/react-query") ||
            id.includes("node_modules/@tanstack/query-core")
          ) {
            return "query";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "supabase";
          }
          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/remark") ||
            id.includes("node_modules/rehype") ||
            id.includes("node_modules/unified") ||
            id.includes("node_modules/mdast") ||
            id.includes("node_modules/hast") ||
            id.includes("node_modules/micromark") ||
            id.includes("node_modules/vfile")
          ) {
            return "markdown";
          }
          if (
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react/")
          ) {
            return "ui-vendor";
          }
        },
      },
    },
  },
}));
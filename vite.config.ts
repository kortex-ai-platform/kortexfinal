// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
const supabaseUrl = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      // Server functions run from a bundled runtime where process.env can be empty in preview.
      // These values are public Lovable Cloud config, equivalent to the existing VITE_* vars.
      "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
  },
});

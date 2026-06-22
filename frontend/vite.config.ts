import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const envDir = resolve(__dirname, "../env");

/** Maps Vite mode to APP_ENV files in env/ (see backend/scripts/loadEnv.mjs). */
function appEnvFromViteMode(mode: string): "local" | "prod" {
  return mode === "prod" ? "prod" : "local";
}

/** Vite disallows mode name "local" (conflicts with the .local env postfix). */
function viteEnvMode(mode: string): string {
  return mode === "prod" ? "prod" : "development";
}

/** Mirror backend/scripts/loadEnv.mjs — no dotenv dependency in frontend CI. */
function syncBuildEnvFromProcess(): void {
  if (!process.env.VITE_GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_ID?.trim()) {
    process.env.VITE_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID.trim();
  }
  if (!process.env.VITE_PADDLE_CLIENT_TOKEN?.trim() && process.env.PADDLE_CLIENT_TOKEN?.trim()) {
    process.env.VITE_PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN.trim();
  }
  if (!process.env.VITE_PADDLE_ENV?.trim() && process.env.PADDLE_ENV?.trim()) {
    process.env.VITE_PADDLE_ENV = process.env.PADDLE_ENV.trim();
  }
}

export default defineConfig(({ mode }) => {
  syncBuildEnvFromProcess();
  const sharedEnv = loadEnv(viteEnvMode(mode), envDir, "");
  const frontendEnv = loadEnv(viteEnvMode(mode), __dirname, "");

  // Prefer frontend/.env over inherited process.env (stale shell/Cursor env vars).
  const googleClientId =
    frontendEnv.VITE_GOOGLE_CLIENT_ID?.trim() ||
    sharedEnv.VITE_GOOGLE_CLIENT_ID?.trim() ||
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    "";

  if (mode !== "prod" && !googleClientId) {
    console.warn(
      "[vite] VITE_GOOGLE_CLIENT_ID is empty — Google Sign-In will not work. Set it in frontend/.env",
    );
  } else if (mode !== "prod") {
    console.log(`[vite] Google OAuth client: ${googleClientId.slice(0, 12)}…`);
  }
  const paddleClientToken =
    process.env.VITE_PADDLE_CLIENT_TOKEN?.trim() ||
    frontendEnv.VITE_PADDLE_CLIENT_TOKEN?.trim() ||
    sharedEnv.VITE_PADDLE_CLIENT_TOKEN?.trim() ||
    "";
  const paddleEnv =
    process.env.VITE_PADDLE_ENV?.trim() ||
    frontendEnv.VITE_PADDLE_ENV?.trim() ||
    sharedEnv.VITE_PADDLE_ENV?.trim() ||
    "sandbox";

  const apiBaseRaw =
    process.env.VITE_API_BASE?.trim() ||
    frontendEnv.VITE_API_BASE?.trim() ||
    sharedEnv.VITE_API_BASE?.trim() ||
    "";
  // Prod builds must not call localhost (e.g. from frontend/.env or Vercel misconfiguration).
  const apiBase =
    appEnvFromViteMode(mode) === "prod" && /localhost|127\.0\.0\.1/i.test(apiBaseRaw)
      ? ""
      : apiBaseRaw;

  return {
    envDir,
    define: {
      "import.meta.env.VITE_API_BASE": JSON.stringify(apiBase),
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
      "import.meta.env.VITE_PADDLE_CLIENT_TOKEN": JSON.stringify(paddleClientToken),
      "import.meta.env.VITE_PADDLE_ENV": JSON.stringify(paddleEnv),
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom", "react-i18next", "i18next"],
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: "http://localhost:3002",
          changeOrigin: true,
        },
      },
    },
  };
});

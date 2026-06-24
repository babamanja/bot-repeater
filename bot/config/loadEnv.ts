import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(moduleDir, "../../env");
const backendEnvPath = resolve(moduleDir, "../../backend/.env");

function normalizeAppEnv(raw: string | undefined): string {
  const value = raw?.trim().toLowerCase();
  if (value === "prod" || value === "production") {
    return "prod";
  }
  if (value === "staging") {
    return "staging";
  }
  return "local";
}

/** Loads env files from repo `env/` and `backend/.env`. Host-provided vars are never overwritten. */
export function loadEnv(mode?: string): void {
  const appEnv = normalizeAppEnv(mode ?? process.env.APP_ENV);
  if (process.env.APP_ENV === undefined) {
    process.env.APP_ENV = appEnv;
  }

  const files = [".env", ".env.local", `.env.${appEnv}`, `.env.${appEnv}.local`];
  const merged: Record<string, string> = {};

  for (const name of files) {
    const path = resolve(envDir, name);
    if (!existsSync(path)) {
      continue;
    }
    const parsed = config({ path, processEnv: {} });
    if (parsed.parsed) {
      Object.assign(merged, parsed.parsed);
    }
  }

  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  if (existsSync(backendEnvPath)) {
    const parsed = config({ path: backendEnvPath, processEnv: {} });
    if (parsed.parsed) {
      for (const [key, value] of Object.entries(parsed.parsed)) {
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

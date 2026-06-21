import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { AppEnv } from "./appEnv.js";

export type { AppEnv } from "./appEnv.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const envDir = resolve(moduleDir, "../../../env");
const backendEnvPath = resolve(moduleDir, "../../.env");

const VALID_ENVS = new Set<AppEnv>(["local", "prod"]);

function syncViteGoogleClientId(): void {
  if (!process.env.VITE_GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_ID?.trim()) {
    process.env.VITE_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID.trim();
  }
}

function hostToOrigin(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

/** Use Vercel deployment URL when AUTH_PUBLIC_APP_URL is not set (email links, etc.). */
function syncAuthPublicAppUrl(): void {
  if (process.env.AUTH_PUBLIC_APP_URL?.trim()) {
    return;
  }
  for (const key of [
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
  ] as const) {
    const origin = hostToOrigin(process.env[key]);
    if (origin) {
      process.env.AUTH_PUBLIC_APP_URL = origin;
      return;
    }
  }
}

function normalizeAppEnv(raw: string | undefined): AppEnv {
  const value = (raw ?? "local").trim().toLowerCase();
  if (value === "prod") {
    return "prod";
  }
  if (value !== "local") {
    console.warn(`Unknown APP_ENV="${raw}", using "local"`);
  }
  return "local";
}

/** Loads env files from repo `env/` (local dev). Host-provided vars are never overwritten. */
export function loadEnv(mode?: string): AppEnv {
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

  syncViteGoogleClientId();
  syncAuthPublicAppUrl();

  return appEnv;
}

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV?.trim().toLowerCase();
  return value === "prod" ? "prod" : "local";
}

export function isProd(): boolean {
  return getAppEnv() === "prod";
}

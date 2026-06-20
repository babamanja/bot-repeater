/**
 * Loads env files from ../../env (same order as Vite loadEnv).
 * Host-provided variables (e.g. Vercel) are never overwritten.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../env");
const backendEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), "../.env");

function syncViteGoogleClientId() {
  if (!process.env.VITE_GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_ID?.trim()) {
    process.env.VITE_GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID.trim();
  }
}

function hostToOrigin(raw) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

/** Use Vercel deployment URL when AUTH_PUBLIC_APP_URL is not set (email links, etc.). */
function syncAuthPublicAppUrl() {
  if (process.env.AUTH_PUBLIC_APP_URL?.trim()) {
    return;
  }
  for (const key of ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL", "VERCEL_BRANCH_URL"]) {
    const origin = hostToOrigin(process.env[key]);
    if (origin) {
      process.env.AUTH_PUBLIC_APP_URL = origin;
      return;
    }
  }
}

const VALID_ENVS = new Set(["local", "prod"]);

function normalizeAppEnv(raw) {
  const value = (raw ?? "local").trim().toLowerCase();
  if (!VALID_ENVS.has(value)) {
    console.warn(`Unknown APP_ENV="${raw}", using "local"`);
    return "local";
  }
  return value;
}

/**
 * @param {string} [mode] - Vite mode or APP_ENV; defaults to process.env.APP_ENV or "local"
 */
export function loadEnv(mode) {
  const appEnv = normalizeAppEnv(mode ?? process.env.APP_ENV);
  if (process.env.APP_ENV === undefined) {
    process.env.APP_ENV = appEnv;
  }

  const files = [".env", ".env.local", `.env.${appEnv}`, `.env.${appEnv}.local`];
  const merged = {};

  for (const name of files) {
    const path = resolve(envDir, name);
    if (!existsSync(path)) continue;
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

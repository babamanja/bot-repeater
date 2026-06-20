/**
 * Loads env files and sets DATABASE_URL the same way as src/index.ts so Prisma CLI works.
 * Usage: node scripts/with-database-url.mjs migrate deploy
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./loadEnv.mjs";

loadEnv();

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendEnvPath = resolve(backendDir, ".env");
if (existsSync(backendEnvPath)) {
  config({ path: backendEnvPath });
}

import { spawnSync } from "node:child_process";
const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx";
const USE_SHELL = process.platform === "win32";

const explicit = process.env.DATABASE_URL?.trim();
if (!explicit) {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = process.env;
  if (DB_USER && DB_HOST && DB_PORT && DB_DATABASE) {
    process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "Missing DATABASE_URL. Set it in env/.env.local (see env/.env.local.example) " +
      "or in backend/.env, or provide DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE.",
  );
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/with-database-url.mjs <prisma subcommand> [args...]");
  process.exit(1);
}

const r = spawnSync(NPX_BIN, ["prisma", ...prismaArgs], {
  stdio: "inherit",
  shell: USE_SHELL,
  env: process.env,
});
if (r.error) {
  console.error(`[with-database-url] Failed to run ${NPX_BIN}:`, r.error.message);
  process.exit(1);
}
process.exit(r.status ?? 1);

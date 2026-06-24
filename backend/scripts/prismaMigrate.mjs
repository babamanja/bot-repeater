/**
 * Shared Prisma CLI helpers for local migrate / baseline flows.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx";
const USE_SHELL = process.platform === "win32";

export const BASELINE_MIGRATION = "20260621120000_init_vocab_bot";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRISMA_BIN = resolve(
  backendDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);

function prismaCommand() {
  return existsSync(PRISMA_BIN) ? PRISMA_BIN : NPX_BIN;
}

function prismaArgs(args) {
  return existsSync(PRISMA_BIN) ? args : ["prisma", ...args];
}

export function isP3005Error(output) {
  const text = output ?? "";
  return text.includes("P3005") || text.includes("database schema is not empty");
}

export function isP3018Error(output) {
  const text = output ?? "";
  return text.includes("P3018") || text.includes("migration failed to apply");
}

export function isP3009Error(output) {
  const text = output ?? "";
  return text.includes("P3009") || text.includes("found failed migrations in the target database");
}

export function hasFailedMigrationError(output) {
  return isP3009Error(output) || isP3018Error(output);
}

export function extractFailedMigrationName(output) {
  const text = output ?? "";
  const explicit = text.match(/Migration name: ([^\s]+)/);
  if (explicit?.[1]) {
    return explicit[1];
  }
  const blocked = text.match(/The `([^`]+)` migration (?:started|failed)/);
  return blocked?.[1] ?? null;
}

/** Idempotent repairs skipped when init migration is baselined without running SQL. */
export const BASELINE_DRIFT_REPAIR_SQL = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
];

/**
 * @param {string[]} args Prisma CLI args after `prisma`
 * @param {{ capture?: boolean }} [options]
 */
export function runPrisma(args, options = {}) {
  const capture = options.capture === true;
  const command = prismaCommand();
  const commandArgs = prismaArgs(args);
  const result = spawnSync(command, commandArgs, {
    cwd: backendDir,
    env: process.env,
    shell: USE_SHELL && command === NPX_BIN,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run ${command}: ${result.error.message}`);
  }

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";

  return {
    status: result.status ?? 1,
    output: `${stdout}\n${stderr}`.trim(),
  };
}

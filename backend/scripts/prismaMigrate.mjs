/**
 * Shared Prisma CLI helpers for local migrate / baseline flows.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx";
const USE_SHELL = process.platform === "win32";

export const BASELINE_MIGRATION = "20260621120000_init_vocab_bot";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function isP3005Error(output) {
  const text = output ?? "";
  return text.includes("P3005") || text.includes("database schema is not empty");
}

/**
 * @param {string[]} args Prisma CLI args after `prisma`
 * @param {{ capture?: boolean }} [options]
 */
export function runPrisma(args, options = {}) {
  const capture = options.capture === true;
  const result = spawnSync(NPX_BIN, ["prisma", ...args], {
    cwd: backendDir,
    env: process.env,
    shell: USE_SHELL,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw new Error(`Failed to run ${NPX_BIN} prisma: ${result.error.message}`);
  }

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";

  return {
    status: result.status ?? 1,
    output: `${stdout}\n${stderr}`,
  };
}

/**
 * Fails the build if compiled loadEnv.js still bridges to scripts/loadEnv.mjs (ERR_REQUIRE_ESM on Vercel).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distLoadEnv = resolve(backendDir, "dist/config/loadEnv.js");
const authController = resolve(backendDir, "dist/controllers/auth.controller.js");
const serverlessEntry = resolve(backendDir, "src/serverless.ts");
const serverlessLoader = resolve(backendDir, "../api/serverlessLoader.cjs");

const forbiddenInLoadEnvJs = ["loadEnv.mjs", "createRequire("];

if (!existsSync(distLoadEnv)) {
  console.error("[verify-serverless] Missing backend/dist/config/loadEnv.js — run backend build first");
  process.exit(1);
}

const loadEnvText = readFileSync(distLoadEnv, "utf8");
for (const pattern of forbiddenInLoadEnvJs) {
  if (loadEnvText.includes(pattern)) {
    console.error(
      `[verify-serverless] dist/config/loadEnv.js must not reference ${pattern} (breaks Vercel serverless)`,
    );
    process.exit(1);
  }
}

if (!existsSync(authController)) {
  console.error("[verify-serverless] Missing backend/dist/controllers/auth.controller.js");
  process.exit(1);
}

const authText = readFileSync(authController, "utf8");
if (authText.includes("../config/loadEnv.js")) {
  console.error("[verify-serverless] auth.controller.js must import appEnv.js, not loadEnv.js");
  process.exit(1);
}

if (!existsSync(serverlessLoader)) {
  console.error("[verify-serverless] Missing api/serverlessLoader.cjs");
  process.exit(1);
}

const loaderText = readFileSync(serverlessLoader, "utf8");
if (!loaderText.includes('await import(serverlessModule)')) {
  console.error("[verify-serverless] serverlessLoader.cjs must use dynamic import()");
  process.exit(1);
}
if (/require\([^)]*serverless/.test(loaderText)) {
  console.error("[verify-serverless] serverlessLoader.cjs must not require() backend serverless");
  process.exit(1);
}

if (!existsSync(serverlessEntry)) {
  console.error("[verify-serverless] Missing backend/src/serverless.ts");
  process.exit(1);
}

const serverlessText = readFileSync(serverlessEntry, "utf8");
if (/^\s*import\b.*\bloadEnv\b/m.test(serverlessText)) {
  console.error("[verify-serverless] serverless.ts must not import loadEnv");
  process.exit(1);
}

console.log("[verify-serverless] OK");

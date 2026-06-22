import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FORBIDDEN_IN_LOAD_ENV_JS = ["loadEnv.mjs", "createRequire("];

function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

test("dist/config/loadEnv.js does not bridge to scripts/loadEnv.mjs", (t) => {
  const distPath = resolve(backendRoot, "dist/config/loadEnv.js");
  if (!existsSync(distPath)) {
    t.skip("backend/dist not built yet");
    return;
  }

  const source = readUtf8(distPath);
  for (const pattern of FORBIDDEN_IN_LOAD_ENV_JS) {
    assert.equal(
      source.includes(pattern),
      false,
      `dist/config/loadEnv.js must not contain ${pattern}`,
    );
  }
});

test("auth controller imports cookie flags from appEnv, not loadEnv", () => {
  const source = readUtf8(resolve(backendRoot, "src/controllers/auth.controller.ts"));
  assert.match(source, /from ["']\.\.\/config\/appEnv\.js["']/);
  assert.doesNotMatch(source, /from ["']\.\.\/config\/loadEnv\.js["']/);
});

test("serverless entry does not import loadEnv module", () => {
  const source = readUtf8(resolve(backendRoot, "src/serverless.ts"));
  assert.doesNotMatch(source, /^\s*import\b.*\bloadEnv\b/m);
});

test("createApp boots without loading loadEnv module", async () => {
  const { createApp } = await import("../src/app.js");
  const app = createApp();
  assert.equal(typeof app, "function");
});

test("api handler source imports serverless entry from backend/src", () => {
  const apiIndexPath = resolve(backendRoot, "../api/index.ts");
  const source = readUtf8(apiIndexPath);
  assert.match(source, /from ["']\.\.\/backend\/src\/serverless\.js["']/);
  assert.doesNotMatch(source, /backend\/dist\//);
});

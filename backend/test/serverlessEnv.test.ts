import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(backendRoot, "..");

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

test("api handler loads backend through CJS serverlessLoader shim", () => {
  const apiIndexPath = resolve(repoRoot, "api/index.ts");
  const source = readUtf8(apiIndexPath);
  assert.match(source, /from ["']\.\/serverlessLoader\.cjs["']/);
  assert.doesNotMatch(source, /backend\/src\/serverless/);
  assert.doesNotMatch(source, /backend\/dist\/serverless/);
});

test("serverlessLoader.cjs uses runtime import() instead of require()", () => {
  const loaderPath = resolve(repoRoot, "api/serverlessLoader.cjs");
  const source = readUtf8(loaderPath);
  assert.match(source, /await import\(serverlessModule\)/);
  assert.match(source, /\.join\("/);
  assert.doesNotMatch(source, /require\([^)]*serverless/);
});

test("CJS require() of ESM module throws ERR_REQUIRE_ESM on strict Node runtimes", (t) => {
  const requireFromEsmPackage = createRequire(
    resolve(backendRoot, "test/fixtures/esm-package/package.json"),
  );

  try {
    requireFromEsmPackage("./entry.js");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /ERR_REQUIRE_ESM|require\(\) of ES Module/);
    return;
  }

  t.skip("This Node build allows require() of ESM; Vercel guard is import() in serverlessLoader.cjs");
});

test("Vercel CJS handler can require api/serverlessLoader.cjs", () => {
  const requireFromApi = createRequire(resolve(repoRoot, "api/serverlessLoader.cjs"));
  const { loadServerlessApp } = requireFromApi("./serverlessLoader.cjs");
  assert.equal(typeof loadServerlessApp, "function");
});

test("serverlessLoader.cjs can import compiled ESM backend exports", async (t) => {
  const distServerless = resolve(backendRoot, "dist/serverless.js");
  if (!existsSync(distServerless)) {
    t.skip("backend/dist not built yet");
    return;
  }

  const serverlessModule = ["..", "backend", "dist", "serverless.js"].join("/");
  const resolvedFromApi = resolve(repoRoot, "api", serverlessModule);
  const mod = await import(pathToFileURL(resolvedFromApi).href);
  assert.equal(typeof mod.getServerlessApp, "function");
});

test("vercel.json bundles compiled backend dist into api function", () => {
  const vercelConfig = JSON.parse(readUtf8(resolve(repoRoot, "vercel.json")));
  assert.equal(vercelConfig.functions?.["api/index.ts"]?.includeFiles, "backend/dist/**");
});

test("deploy-database.mjs does not statically import loadEnv.mjs", () => {
  const source = readUtf8(resolve(backendRoot, "scripts/deploy-database.mjs"));
  assert.doesNotMatch(
    source,
    /^\s*import\s+.*from\s+["']\.\/loadEnv\.mjs["']/m,
    "static import breaks Vercel when loadEnv.mjs is omitted from the bundle",
  );
  assert.match(source, /import\(["']\.\/loadEnv\.mjs["']\)/);
});

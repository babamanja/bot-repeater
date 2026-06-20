import { createRequire } from "node:module";

import type { AppEnv } from "./appEnv.js";

const require = createRequire(import.meta.url);

const { loadEnv: loadEnvFiles } = require("../../scripts/loadEnv.mjs") as {
  loadEnv: (mode?: string) => AppEnv;
};

export type { AppEnv } from "./appEnv.js";

export function loadEnv(mode?: string): AppEnv {
  return loadEnvFiles(mode);
}

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV?.trim().toLowerCase();
  return value === "prod" ? "prod" : "local";
}

export function isProd(): boolean {
  return getAppEnv() === "prod";
}

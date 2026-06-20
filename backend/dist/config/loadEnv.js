import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { loadEnv: loadEnvFiles } = require("../../scripts/loadEnv.mjs");
export function loadEnv(mode) {
    return loadEnvFiles(mode);
}
export function getAppEnv() {
    const value = process.env.APP_ENV?.trim().toLowerCase();
    return value === "prod" ? "prod" : "local";
}
export function isProd() {
    return getAppEnv() === "prod";
}

export type AppEnv = "local" | "prod";

export function normalizeAppEnv(raw: string | undefined): AppEnv {
  const value = (raw ?? "local").trim().toLowerCase();
  if (value === "prod") {
    return "prod";
  }
  if (value !== "local") {
    console.warn(`Unknown APP_ENV="${raw}", using "local"`);
  }
  return "local";
}

export function getAppEnv(): AppEnv {
  const value = process.env.APP_ENV?.trim().toLowerCase();
  return value === "prod" ? "prod" : "local";
}

export function isProd(): boolean {
  return getAppEnv() === "prod";
}

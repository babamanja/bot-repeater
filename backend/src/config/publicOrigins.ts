/** Normalize a host or URL to an origin (scheme + host + port). */
export function hostToOrigin(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "";
  }
}

function getVercelOriginEnvKeys(): readonly string[] {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") {
    return ["VERCEL_PROJECT_PRODUCTION_URL"];
  }
  if (vercelEnv === "preview") {
    return ["VERCEL_URL", "VERCEL_BRANCH_URL"];
  }
  return ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL", "VERCEL_BRANCH_URL"];
}

/** Extra SPA origins from env and Vercel deployment metadata. */
export function collectConfiguredOrigins(): string[] {
  const origins = new Set<string>();

  for (const raw of process.env.CORS_ORIGINS?.split(",") ?? []) {
    const origin = hostToOrigin(raw);
    if (origin) {
      origins.add(origin);
    }
  }

  for (const key of ["AUTH_PUBLIC_APP_URL"] as const) {
    const origin = hostToOrigin(process.env[key]);
    if (origin) {
      origins.add(origin);
    }
  }

  for (const key of getVercelOriginEnvKeys()) {
    const origin = hostToOrigin(process.env[key]);
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins];
}

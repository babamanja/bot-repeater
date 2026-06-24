import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Let Express read the raw request body (required for Paddle webhook HMAC). */
export const config = {
  api: {
    bodyParser: false,
  },
};

/** Express app is invoked as a Node HTTP listener (compatible with Vercel req/res). */
type HttpApp = (req: VercelRequest, res: VercelResponse) => unknown;

/** Vercel injects env vars; .env files are not deployed. */
function applyHostedEnv(): void {
  if (!process.env.APP_ENV?.trim()) {
    process.env.APP_ENV = "prod";
  }

  if (process.env.AUTH_PUBLIC_APP_URL?.trim()) {
    return;
  }

  for (const key of [
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
  ] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) {
      continue;
    }
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      process.env.AUTH_PUBLIC_APP_URL = new URL(withProtocol).origin;
      return;
    } catch {
      // try next key
    }
  }
}

function resolveDatabaseUrl(): string {
  const databaseUrl =
    process.env.DATABASE_URL?.trim() ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

  if (!databaseUrl || databaseUrl.includes("undefined")) {
    throw new Error(
      "Missing DATABASE_URL or DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE.",
    );
  }

  return databaseUrl;
}

let app: HttpApp | undefined;
let bootstrapPromise: Promise<HttpApp> | undefined;

async function getApp(): Promise<HttpApp> {
  if (app) {
    return app;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      applyHostedEnv();
      const { getServerlessApp } = await import("../backend/src/serverless.js");
      const expressApp = await getServerlessApp(resolveDatabaseUrl());
      app = expressApp as HttpApp;
      return app;
    })();
  }

  return bootstrapPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const expressApp = await getApp();
    expressApp(req, res);
  } catch (error) {
    console.error("[api] Handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error:
          error instanceof Error && error.message.includes("does not exist")
            ? "database schema not initialized — redeploy production or run prisma migrate deploy"
            : "internal server error",
      });
    }
  }
}

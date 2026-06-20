import { createHmac, timingSafeEqual } from "node:crypto";

import { getAppEnv } from "../config/loadEnv.js";
import { hostToOrigin } from "../config/publicOrigins.js";

export type InternalJobChainLogger = {
  log: (
    event: string,
    ctx: Record<string, unknown>,
    extra?: Record<string, unknown>,
  ) => void;
  warn: (
    event: string,
    ctx: Record<string, unknown>,
    extra?: Record<string, unknown>,
  ) => void;
};

export type ScheduleInternalJobContinueOptions = {
  id: string;
  tokenScope: string;
  baseUrlEnvKey?: string;
  headerName: string;
  buildContinuePath: (id: string) => string;
  runInProcess: (id: string) => Promise<void>;
  logger?: InternalJobChainLogger;
};

const CHAIN_ORIGIN_ENV_KEYS = [
  "AUTH_PUBLIC_APP_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
  "VERCEL_BRANCH_URL",
] as const;

function getJwtSecret(): string | null {
  const secret = process.env.AUTH_JWT_SECRET?.trim();
  return secret || null;
}

export function createInternalJobToken(id: string, tokenScope: string): string | null {
  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }
  return createHmac("sha256", secret).update(`${tokenScope}:${id}`).digest("hex");
}

export function verifyInternalJobToken(
  id: string,
  token: unknown,
  tokenScope: string,
): boolean {
  const expected = createInternalJobToken(id, tokenScope);
  if (!expected || typeof token !== "string" || token.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"));
}

function isHostedRuntime(): boolean {
  return process.env.VERCEL === "1" || getAppEnv() === "prod";
}

export function resolveInternalJobChainBaseUrl(baseUrlEnvKey?: string): string {
  if (baseUrlEnvKey) {
    const explicit = hostToOrigin(process.env[baseUrlEnvKey]);
    if (explicit) {
      return explicit;
    }
  }

  if (!isHostedRuntime()) {
    const port = Number(process.env.PORT) || 3001;
    return `http://127.0.0.1:${port}`;
  }

  for (const key of CHAIN_ORIGIN_ENV_KEYS) {
    const origin = hostToOrigin(process.env[key]);
    if (origin) {
      return origin;
    }
  }

  const port = Number(process.env.PORT) || 3001;
  return `http://127.0.0.1:${port}`;
}

function defaultLogger(logPrefix: string): InternalJobChainLogger {
  return {
    log(event, ctx, extra) {
      console.log(`[${logPrefix}] ${event}`, { ...ctx, ...extra });
    },
    warn(event, ctx, extra) {
      console.warn(`[${logPrefix}] ${event}`, { ...ctx, ...extra });
    },
  };
}

function scheduleContinueInProcess(
  options: Pick<
    ScheduleInternalJobContinueOptions,
    "id" | "runInProcess" | "logger" | "tokenScope"
  >,
  reason: string,
): void {
  const ctx = { id: options.id };
  const logger = options.logger ?? defaultLogger(options.tokenScope);
  logger.log("chain.schedule.in_process", ctx, { reason });
  void options.runInProcess(options.id).catch((error) => {
    logger.warn("chain.schedule.in_process_failed", ctx, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

/** Fire-and-forget: triggers the next step in-process locally or via HTTP on hosted runtimes. */
export function scheduleInternalJobContinue(
  options: ScheduleInternalJobContinueOptions,
): void {
  const ctx = { id: options.id };
  const logger = options.logger ?? defaultLogger(options.tokenScope);
  const token = createInternalJobToken(options.id, options.tokenScope);

  if (!token) {
    scheduleContinueInProcess(options, "no_auth_jwt_secret");
    return;
  }

  // Local dev: AUTH_PUBLIC_APP_URL often points at production; run in-process instead.
  if (!isHostedRuntime()) {
    scheduleContinueInProcess(options, "local_runtime");
    return;
  }

  const baseUrl = resolveInternalJobChainBaseUrl(options.baseUrlEnvKey);
  const url = `${baseUrl}${options.buildContinuePath(options.id)}`;
  logger.log("chain.schedule.http", ctx, { baseUrl });
  void fetch(url, {
    method: "POST",
    headers: {
      [options.headerName]: token,
    },
  })
    .then((response) => {
      if (!response.ok) {
        logger.warn("chain.schedule.http_bad_status", ctx, {
          status: response.status,
          statusText: response.statusText,
        });
      }
    })
    .catch((error) => {
      logger.warn("chain.schedule.http_failed", ctx, {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

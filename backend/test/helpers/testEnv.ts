import crypto from "node:crypto";

/** Minimal env vars required for HTTP integration tests (no database). */
export function applyHttpTestEnv(): void {
  process.env.AUTH_JWT_SECRET ??= "test-jwt-secret-for-http-tests";
  process.env.AUTH_REFRESH_SECRET ??= "test-refresh-secret-for-http-tests";
  process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id.apps.googleusercontent.com";
}

export function applyPaddleWebhookTestEnv(secret = "test-paddle-webhook-secret"): void {
  applyHttpTestEnv();
  process.env.PADDLE_WEBHOOK_SECRET = secret;
}

export function buildPaddleSignatureHeader(
  body: string,
  secret: string,
  timestampSec = Math.floor(Date.now() / 1000),
): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestampSec}:${body}`)
    .digest("hex");
  return `ts=${timestampSec};h1=${digest}`;
}

import crypto from "node:crypto";

/** Max age of Paddle webhook `ts=` (seconds), per Paddle replay guidance. */
export const PADDLE_WEBHOOK_MAX_AGE_SEC = 300;

export function isPaddleTimestampFresh(timestamp: string): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) {
    return false;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - ts) <= PADDLE_WEBHOOK_MAX_AGE_SEC;
}

export type PaddleWebhookVerificationFailure =
  | "missing_secret"
  | "invalid_header"
  | "stale_timestamp"
  | "signature_mismatch";

export function getPaddleWebhookVerificationFailure(
  rawBody: Buffer | string,
  signatureHeader: string,
  secret: string,
): PaddleWebhookVerificationFailure | null {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    return "missing_secret";
  }
  const parts = signatureHeader.split(";").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("ts="))?.slice(3);
  const signature = parts.find((part) => part.startsWith("h1="))?.slice(3);
  if (!timestamp || !signature) {
    return "invalid_header";
  }
  if (!isPaddleTimestampFresh(timestamp)) {
    return "stale_timestamp";
  }
  const bodyText = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : String(rawBody);
  const signedPayload = `${timestamp}:${bodyText}`;
  const digest = crypto
    .createHmac("sha256", trimmedSecret)
    .update(signedPayload)
    .digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");
  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return "signature_mismatch";
  }
  return null;
}

export function verifyPaddleWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
  secret: string,
): boolean {
  return (
    getPaddleWebhookVerificationFailure(rawBody, signatureHeader, secret) ===
    null
  );
}

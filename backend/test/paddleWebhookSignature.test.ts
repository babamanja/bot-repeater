import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  isPaddleTimestampFresh,
  PADDLE_WEBHOOK_MAX_AGE_SEC,
  verifyPaddleWebhookSignature,
} from "../src/utils/paddleWebhookSignature.js";

test("isPaddleTimestampFresh accepts current timestamp", () => {
  const now = String(Math.floor(Date.now() / 1000));
  assert.equal(isPaddleTimestampFresh(now), true);
});

test("isPaddleTimestampFresh rejects stale timestamp", () => {
  const stale = String(Math.floor(Date.now() / 1000) - PADDLE_WEBHOOK_MAX_AGE_SEC - 1);
  assert.equal(isPaddleTimestampFresh(stale), false);
});

test("verifyPaddleWebhookSignature rejects replayed old signature", () => {
  const secret = "test-webhook-secret";
  const body = '{"event_type":"transaction.completed"}';
  const staleTs = String(Math.floor(Date.now() / 1000) - PADDLE_WEBHOOK_MAX_AGE_SEC - 10);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${staleTs}:${body}`)
    .digest("hex");
  const header = `ts=${staleTs};h1=${digest}`;
  assert.equal(verifyPaddleWebhookSignature(body, header, secret), false);
});

test("verifyPaddleWebhookSignature accepts valid fresh signature", () => {
  const secret = "test-webhook-secret";
  const body = '{"event_type":"transaction.completed"}';
  const ts = String(Math.floor(Date.now() / 1000));
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${body}`)
    .digest("hex");
  const header = `ts=${ts};h1=${digest}`;
  assert.equal(verifyPaddleWebhookSignature(body, header, secret), true);
});

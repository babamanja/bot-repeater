import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../../src/app.js";
import {
  applyPaddleWebhookTestEnv,
  buildPaddleSignatureHeader,
} from "../helpers/testEnv.js";

const WEBHOOK_SECRET = "test-paddle-webhook-secret";

applyPaddleWebhookTestEnv(WEBHOOK_SECRET);

test("POST /api/subscriptions/provider/paddle/webhook rejects invalid signature", async () => {
  const app = createApp();
  const body = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_test" } });
  const res = await request(app)
    .post("/api/subscriptions/provider/paddle/webhook")
    .set("Content-Type", "application/json")
    .set(
      "Paddle-Signature",
      buildPaddleSignatureHeader(body, "wrong-secret"),
    )
    .send(body);
  assert.equal(res.status, 401);
  assert.equal(res.body?.error, "invalid webhook signature");
});

test("POST /api/subscriptions/provider/paddle/webhook accepts signature but rejects missing paymentId", async () => {
  const app = createApp();
  const body = JSON.stringify({
    event_type: "transaction.completed",
    data: { id: "txn_test", status: "completed" },
  });
  const res = await request(app)
    .post("/api/subscriptions/provider/paddle/webhook")
    .set("Content-Type", "application/json")
    .set("Paddle-Signature", buildPaddleSignatureHeader(body, WEBHOOK_SECRET))
    .send(body);
  assert.equal(res.status, 400);
  assert.equal(res.body?.error, "paymentId missing in webhook");
});

test("POST /api/subscriptions/provider/paddle/webhook rejects stale signature", async () => {
  const app = createApp();
  const body = JSON.stringify({ event_type: "transaction.completed" });
  const staleTs = Math.floor(Date.now() / 1000) - 3600;
  const res = await request(app)
    .post("/api/subscriptions/provider/paddle/webhook")
    .set("Content-Type", "application/json")
    .set("Paddle-Signature", buildPaddleSignatureHeader(body, WEBHOOK_SECRET, staleTs))
    .send(body);
  assert.equal(res.status, 401);
});

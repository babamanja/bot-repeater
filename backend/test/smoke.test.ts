import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";

test("GET /api/health returns ok", async () => {
  const app = createApp();
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"]?.includes("application/json"), true);
  assert.equal(res.body?.ok, true);
});

test("GET /api/quiz/:quizId/results without Authorization returns 401", async () => {
  const app = createApp();
  const quizId = "550e8400-e29b-41d4-a716-446655440000";
  const res = await request(app).get(`/api/quiz/${quizId}/results`);
  assert.equal(res.status, 401);
});

test("POST /api/subscriptions/provider/paddle/webhook without signature returns 400", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/subscriptions/provider/paddle/webhook")
    .set("Content-Type", "application/json")
    .send("{}");
  assert.equal(res.status, 400);
});

test("GET /api/attempts/list without Authorization returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/attempts/list");
  assert.equal(res.status, 401);
});

test("GET /api/subscriptions/me without Authorization returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/subscriptions/me");
  assert.equal(res.status, 401);
});

test("GET /api/admin/feedback without Authorization returns 401", async () => {
  const app = createApp();
  const res = await request(app).get("/api/admin/feedback");
  assert.equal(res.status, 401);
});

test("POST /api/subscriptions/payments/:paymentId/sync-paddle without Authorization returns 401", async () => {
  const app = createApp();
  const paymentId = "550e8400-e29b-41d4-a716-446655440000";
  const res = await request(app).post(
    `/api/subscriptions/payments/${paymentId}/sync-paddle`,
  );
  assert.equal(res.status, 401);
});

test("OPTIONS /api/health includes CORS headers for allowed dev origin", async () => {
  const app = createApp();
  const res = await request(app)
    .options("/api/health")
    .set("Origin", "http://localhost:5173")
    .set("Access-Control-Request-Method", "GET");
  assert.ok([200, 204].includes(res.status), `unexpected status ${res.status}`);
  const allowOrigin = res.headers["access-control-allow-origin"];
  assert.equal(allowOrigin, "http://localhost:5173");
});

test("POST /api/auth/account/restore without credentials returns 400", async () => {
  const app = createApp();
  const res = await request(app).post("/api/auth/account/restore").send({});
  assert.equal(res.status, 400);
});

test("DELETE /api/quiz/:quizId without Authorization returns 401", async () => {
  const app = createApp();
  const quizId = "550e8400-e29b-41d4-a716-446655440000";
  const res = await request(app).delete(`/api/quiz/${quizId}`);
  assert.equal(res.status, 401);
});

test("POST /api/documents without Authorization returns 401", async () => {
  const app = createApp();
  const res = await request(app).post("/api/documents").send({
    sourceType: "text",
    fullText: "hello",
  });
  assert.equal(res.status, 401);
});

test("DELETE /api/documents/:documentId without Authorization returns 401", async () => {
  const app = createApp();
  const documentId = "550e8400-e29b-41d4-a716-446655440000";
  const res = await request(app).delete(`/api/documents/${documentId}`);
  assert.equal(res.status, 401);
});

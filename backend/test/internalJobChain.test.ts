import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";

import {
  createInternalJobToken,
  verifyInternalJobToken,
} from "../src/services/internalJobChain.service.js";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_SECRET = process.env.AUTH_JWT_SECRET;

before(() => {
  process.env.AUTH_JWT_SECRET = "test-internal-job-chain-secret";
});

after(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.AUTH_JWT_SECRET;
  } else {
    process.env.AUTH_JWT_SECRET = ORIGINAL_SECRET;
  }
});

describe("internalJobChain", () => {
  it("creates and verifies a pdf-ocr token", () => {
    const token = createInternalJobToken(JOB_ID, "pdf-ocr-continue");
    assert.ok(token);
    assert.equal(verifyInternalJobToken(JOB_ID, token, "pdf-ocr-continue"), true);
  });

  it("creates and verifies a quiz-generation token", () => {
    const token = createInternalJobToken(JOB_ID, "quiz-generation-continue");
    assert.ok(token);
    assert.equal(verifyInternalJobToken(JOB_ID, token, "quiz-generation-continue"), true);
  });

  it("rejects token with wrong scope", () => {
    const token = createHmac("sha256", process.env.AUTH_JWT_SECRET!)
      .update(`quiz-generation-continue:${JOB_ID}`)
      .digest("hex");
    assert.equal(verifyInternalJobToken(JOB_ID, token, "pdf-ocr-continue"), false);
  });

  it("rejects an invalid token", () => {
    assert.equal(verifyInternalJobToken(JOB_ID, "bad-token", "pdf-ocr-continue"), false);
  });
});

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";

import {
  verifyQuizGenerationInternalToken,
} from "../src/services/quizGenerationChain.service.js";

const QUIZ_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_SECRET = process.env.AUTH_JWT_SECRET;

before(() => {
  process.env.AUTH_JWT_SECRET = "test-quiz-generation-chain-secret";
});

after(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.AUTH_JWT_SECRET;
  } else {
    process.env.AUTH_JWT_SECRET = ORIGINAL_SECRET;
  }
});

describe("quizGenerationChain", () => {
  it("accepts a valid internal token", () => {
    const token = createHmac("sha256", process.env.AUTH_JWT_SECRET!)
      .update(`quiz-generation-continue:${QUIZ_ID}`)
      .digest("hex");
    assert.equal(verifyQuizGenerationInternalToken(QUIZ_ID, token), true);
  });

  it("rejects an invalid token", () => {
    assert.equal(verifyQuizGenerationInternalToken(QUIZ_ID, "bad-token"), false);
  });
});

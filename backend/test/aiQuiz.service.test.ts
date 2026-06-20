import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";

const SAMPLE_QUIZ_JSON = {
  title: "Math basics",
  questions: [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      prompt: "What is 2 + 2?",
      correctAnswerIds: ["550e8400-e29b-41d4-a716-446655440011"],
      options: [
        { answerId: "550e8400-e29b-41d4-a716-446655440011", text: "4" },
        { answerId: "550e8400-e29b-41d4-a716-446655440012", text: "3" },
        { answerId: "550e8400-e29b-41d4-a716-446655440013", text: "5" },
        { answerId: "550e8400-e29b-41d4-a716-446655440014", text: "22" },
      ],
    },
  ],
};

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-openai-key";
});

afterEach(() => {
  mock.restoreAll();
  delete process.env.OPENAI_API_KEY;
});

test("buildQuizWithAi returns normalized quiz when OpenAI responds with valid JSON", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({
      output_text: JSON.stringify(SAMPLE_QUIZ_JSON),
      model: "gpt-4o-mini",
      usage: { input_tokens: 100, output_tokens: 200, total_tokens: 300 },
    }),
  );

  const { buildQuizWithAi } = await import("../src/services/aiQuiz.service.js");
  const result = await buildQuizWithAi("Source text about arithmetic.", "English", 1);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.quiz.title, "Math basics");
    assert.equal(result.quiz.questions.length, 1);
    assert.equal(result.quiz.questions[0]?.options.length, 4);
    assert.equal(result.model, "gpt-4o-mini");
    assert.equal(result.usage.totalTokens, 300);
  }
});

test("buildQuizWithAi returns error when OPENAI_API_KEY is missing", async () => {
  delete process.env.OPENAI_API_KEY;
  const { buildQuizWithAi } = await import("../src/services/aiQuiz.service.js");
  const result = await buildQuizWithAi("text", "English", 1);
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.match(result.error, /OPENAI_API_KEY/);
  }
});

test("buildQuizWithAi surfaces OpenAI HTTP errors", async () => {
  mock.method(globalThis, "fetch", async () =>
    new Response("rate limit", { status: 429, statusText: "Too Many Requests" }),
  );

  const { buildQuizWithAi } = await import("../src/services/aiQuiz.service.js");
  const result = await buildQuizWithAi("text", "English", 1);
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.match(result.error, /OpenAI request failed \(429\)/);
  }
});

test("buildQuizWithAi rejects invalid quiz schema from OpenAI", async () => {
  mock.method(globalThis, "fetch", async () =>
    Response.json({
      output_text: JSON.stringify({
        title: "Broken",
        questions: [
          {
            id: "q1",
            prompt: "Bad question?",
            correctAnswerIds: ["a1"],
            options: [{ answerId: "a1", text: "Only one option" }],
          },
        ],
      }),
      model: "gpt-4o-mini",
    }),
  );

  const { buildQuizWithAi } = await import("../src/services/aiQuiz.service.js");
  const result = await buildQuizWithAi("text", "English", 1);
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.equal(result.error, "OpenAI returned invalid quiz schema");
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateAllChunksQuizTokens,
  estimateDocumentSummarizationTokens,
  estimateFullUploadGenerationCost,
  getDefaultGenerationSettings,
} from "../src/services/generationSettings.service.js";

const settings = getDefaultGenerationSettings();

test("estimateDocumentSummarizationTokens scales with chunk count", () => {
  const shortText = "hello";
  const longText = "a".repeat(settings.chunkSizeChars * 2 + 1);
  assert.equal(
    estimateDocumentSummarizationTokens(shortText, settings),
    settings.tokensPerChunkSummary,
  );
  assert.ok(
    estimateDocumentSummarizationTokens(longText, settings) >
      estimateDocumentSummarizationTokens(shortText, settings),
  );
});

test("estimateAllChunksQuizTokens scales with chunk count", () => {
  const shortText = "short text";
  const longText = "a".repeat(settings.chunkSizeChars * 2 + 1);
  const shortEstimate = estimateAllChunksQuizTokens(shortText, 10, settings);
  const longEstimate = estimateAllChunksQuizTokens(longText, 10, settings);
  assert.ok(shortEstimate >= 1);
  assert.ok(longEstimate > shortEstimate);
});

test("estimateFullUploadGenerationCost sums summarization and quiz", () => {
  const text = "Sample paragraph for a quiz.";
  const costs = estimateFullUploadGenerationCost(text, 8, settings);
  assert.equal(
    costs.totalEstimatedTokens,
    costs.summarizationTokens + costs.quizGenerationTokens,
  );
});

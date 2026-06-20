import assert from "node:assert/strict";
import test from "node:test";

import { parseChunkSummaryResponse } from "../src/services/chunkSummaryResponse.js";

test("parseChunkSummaryResponse parses JSON object", () => {
  const parsed = parseChunkSummaryResponse(
    JSON.stringify({
      title: "Skeletal system overview",
      summary: "Bones support the body and protect organs.",
    }),
  );
  assert.deepEqual(parsed, {
    title: "Skeletal system overview",
    summary: "Bones support the body and protect organs.",
  });
});

test("parseChunkSummaryResponse parses fenced JSON", () => {
  const parsed = parseChunkSummaryResponse(
    '```json\n{"title":"Joints","summary":"Joints connect bones."}\n```',
  );
  assert.equal(parsed?.title, "Joints");
  assert.equal(parsed?.summary, "Joints connect bones.");
});

test("parseChunkSummaryResponse falls back to plain text", () => {
  const parsed = parseChunkSummaryResponse("Head bones\nSkull and face bones.", {
    chunkIndex: 1,
  });
  assert.equal(parsed?.title, "Head bones");
  assert.equal(parsed?.summary, "Skull and face bones.");
});

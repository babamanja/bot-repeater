import assert from "node:assert/strict";
import test from "node:test";

import { splitTextIntoChunks } from "../src/utils/textChunking.js";

test("splitTextIntoChunks returns single chunk for short text", () => {
  const chunks = splitTextIntoChunks("hello world", 100);
  assert.deepEqual(chunks, ["hello world"]);
});

test("splitTextIntoChunks splits long text", () => {
  const text = "a".repeat(250);
  const chunks = splitTextIntoChunks(text, 100);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks.join(""), text);
});

test("splitTextIntoChunks supports overlap", () => {
  const text = "abcdefghijklmnopqrstuvwxyz";
  const chunks = splitTextIntoChunks(text, 10, 3);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks[0]!.endsWith("hij"));
  assert.ok(chunks[1]!.startsWith("hij"));
});

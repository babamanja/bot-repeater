import assert from "node:assert/strict";
import test from "node:test";

import { shuffleArray } from "../src/utils/shuffle.js";

test("shuffleArray returns a permutation with the same elements", () => {
  const input = [1, 2, 3, 4];
  const shuffled = shuffleArray(input);
  assert.equal(shuffled.length, input.length);
  assert.deepEqual(
    [...shuffled].sort((a, b) => a - b),
    [...input].sort((a, b) => a - b),
  );
  assert.deepEqual(input, [1, 2, 3, 4]);
});

test("shuffleArray can change order for multi-element arrays", () => {
  const input = Array.from({ length: 8 }, (_, i) => i);
  const orders = new Set<string>();
  for (let attempt = 0; attempt < 40; attempt++) {
    orders.add(shuffleArray(input).join(","));
  }
  assert.ok(orders.size > 1);
});

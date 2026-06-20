import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canCancelSubscription,
  canResumeSubscription,
  resolveEffectivePlanCode,
} from "../src/services/subscriptionPlan.service.js";
import type { SubscriptionRow } from "../src/db/subscriptionRepository.js";

const now = new Date("2026-06-01T12:00:00.000Z");

function row(
  overrides: Partial<SubscriptionRow> & Pick<SubscriptionRow, "planCode" | "status">,
): SubscriptionRow {
  return {
    id: "sub-1",
    userId: 1,
    currentPeriodEnd: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    paymentId: null,
    ...overrides,
  };
}

test("resolveEffectivePlanCode returns basic for missing premium row shape", () => {
  assert.equal(resolveEffectivePlanCode(row({ planCode: "basic", status: "active" }), now), "basic");
});

test("resolveEffectivePlanCode keeps premium until period end when canceled", () => {
  const subscription = row({
    planCode: "premium",
    status: "canceled",
    currentPeriodEnd: "2026-06-15T00:00:00.000Z",
  });
  assert.equal(resolveEffectivePlanCode(subscription, now), "premium");
  assert.equal(canResumeSubscription(subscription, now), true);
  assert.equal(canCancelSubscription(subscription), false);
});

test("resolveEffectivePlanCode downgrades canceled premium after period end", () => {
  const subscription = row({
    planCode: "premium",
    status: "canceled",
    currentPeriodEnd: "2026-05-01T00:00:00.000Z",
  });
  assert.equal(resolveEffectivePlanCode(subscription, now), "basic");
});

test("canCancelSubscription allows active premium only", () => {
  assert.equal(
    canCancelSubscription(row({ planCode: "premium", status: "active" })),
    true,
  );
  assert.equal(
    canCancelSubscription(row({ planCode: "basic", status: "active" })),
    false,
  );
});

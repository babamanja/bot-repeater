import { isTokenTopupAmount, type SubscriptionBillingPeriod } from "../config/paddle.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";

export {
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
  PREMIUM_USD_MONTHLY,
  PREMIUM_USD_YEARLY,
  TOKEN_PACK_PRICES_USD,
  getTokenTopupAmountUsd,
} from "@vocab-bot/shared/pricing";

import {
  PREMIUM_USD_MONTHLY,
  PREMIUM_USD_YEARLY,
} from "@vocab-bot/shared/pricing";

/** Reserved for future AI token economy; subscriptions do not grant tokens today. */
export const PLAN_SUBSCRIPTION_TOKEN_GRANT: Record<
  subscriptionRepository.SubscriptionPlanCode,
  number
> = {
  basic: 0,
  premium: 0,
};

export function getSubscriptionAmount(
  planCode: subscriptionRepository.SubscriptionPlanCode,
  billingPeriod: SubscriptionBillingPeriod,
): number {
  if (planCode !== "premium") {
    return 0;
  }
  return billingPeriod === "yearly" ? PREMIUM_USD_YEARLY : PREMIUM_USD_MONTHLY;
}

export function getSubscriptionPlanTokenGrant(
  planCode: subscriptionRepository.SubscriptionPlanCode,
): number {
  return PLAN_SUBSCRIPTION_TOKEN_GRANT[planCode];
}

export function parseTokenTopupAmount(rawValue: unknown): number {
  const amount = Number(rawValue);
  if (!Number.isInteger(amount) || amount <= 0 || !isTokenTopupAmount(amount)) {
    throw new Error("unsupported tokenAmount");
  }
  return amount;
}

export function parseBillingPeriod(rawValue: unknown): SubscriptionBillingPeriod {
  if (rawValue === "yearly") {
    return "yearly";
  }
  if (rawValue === "monthly" || rawValue === undefined || rawValue === null) {
    return "monthly";
  }
  throw new Error("invalid billingPeriod");
}

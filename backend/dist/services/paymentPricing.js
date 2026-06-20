import { isTokenTopupAmount } from "../config/paddle.js";
export { PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT, PREMIUM_USD_MONTHLY, PREMIUM_USD_YEARLY, TOKEN_PACK_PRICES_USD, getTokenTopupAmountUsd, } from "@vocab-bot/shared/pricing";
import { PREMIUM_USD_MONTHLY, PREMIUM_USD_YEARLY, } from "@vocab-bot/shared/pricing";
/** Reserved for future AI token economy; subscriptions do not grant tokens today. */
export const PLAN_SUBSCRIPTION_TOKEN_GRANT = {
    basic: 0,
    premium: 0,
};
export function getSubscriptionAmount(planCode, billingPeriod) {
    if (planCode !== "premium") {
        return 0;
    }
    return billingPeriod === "yearly" ? PREMIUM_USD_YEARLY : PREMIUM_USD_MONTHLY;
}
export function getSubscriptionPlanTokenGrant(planCode) {
    return PLAN_SUBSCRIPTION_TOKEN_GRANT[planCode];
}
export function parseTokenTopupAmount(rawValue) {
    const amount = Number(rawValue);
    if (!Number.isInteger(amount) || amount <= 0 || !isTokenTopupAmount(amount)) {
        throw new Error("unsupported tokenAmount");
    }
    return amount;
}
export function parseBillingPeriod(rawValue) {
    if (rawValue === "yearly") {
        return "yearly";
    }
    if (rawValue === "monthly" || rawValue === undefined || rawValue === null) {
        return "monthly";
    }
    throw new Error("invalid billingPeriod");
}

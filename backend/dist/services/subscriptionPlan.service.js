import * as subscriptionRepository from "../db/subscriptionRepository.js";
export function resolveEffectivePlanCode(subscription, now = new Date()) {
    if (subscription.planCode !== "premium") {
        return "basic";
    }
    if (subscription.status === "active" || subscription.status === "past_due") {
        return "premium";
    }
    if (subscription.status === "canceled") {
        const periodEnd = subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd)
            : null;
        if (periodEnd && !Number.isNaN(periodEnd.getTime()) && periodEnd > now) {
            return "premium";
        }
    }
    return "basic";
}
export function isCancelAtPeriodEnd(subscription, now = new Date()) {
    return (subscription.planCode === "premium" &&
        subscription.status === "canceled" &&
        resolveEffectivePlanCode(subscription, now) === "premium");
}
export function canCancelSubscription(subscription) {
    return (subscription.planCode === "premium" &&
        (subscription.status === "active" || subscription.status === "past_due"));
}
export function canResumeSubscription(subscription, now = new Date()) {
    return isCancelAtPeriodEnd(subscription, now);
}
export function toSubscriptionView(subscription, now = new Date()) {
    return {
        ...subscription,
        effectivePlanCode: resolveEffectivePlanCode(subscription, now),
        cancelAtPeriodEnd: isCancelAtPeriodEnd(subscription, now),
    };
}
export async function getEffectivePlanCodeForUser(userId) {
    await subscriptionRepository.ensureDefaultBasicSubscription(userId);
    await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
    const subscription = await subscriptionRepository.selectSubscriptionByUserId(userId);
    if (!subscription) {
        return "basic";
    }
    return resolveEffectivePlanCode(subscription);
}

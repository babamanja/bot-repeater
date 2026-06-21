import type {
  SubscriptionPlanCode,
  SubscriptionRow,
} from "../db/subscriptionRepository.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";

export type SubscriptionView = SubscriptionRow & {
  effectivePlanCode: SubscriptionPlanCode;
  cancelAtPeriodEnd: boolean;
};

export function resolveEffectivePlanCode(
  subscription: SubscriptionRow,
  now: Date = new Date(),
): SubscriptionPlanCode {
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

export function isCancelAtPeriodEnd(
  subscription: SubscriptionRow,
  now: Date = new Date(),
): boolean {
  return (
    subscription.planCode === "premium" &&
    subscription.status === "canceled" &&
    resolveEffectivePlanCode(subscription, now) === "premium"
  );
}

export function canCancelSubscription(subscription: SubscriptionRow): boolean {
  return (
    subscription.planCode === "premium" &&
    (subscription.status === "active" || subscription.status === "past_due")
  );
}

export function canResumeSubscription(
  subscription: SubscriptionRow,
  now: Date = new Date(),
): boolean {
  return isCancelAtPeriodEnd(subscription, now);
}

export function toSubscriptionView(
  subscription: SubscriptionRow,
  now: Date = new Date(),
): SubscriptionView {
  return {
    ...subscription,
    effectivePlanCode: resolveEffectivePlanCode(subscription, now),
    cancelAtPeriodEnd: isCancelAtPeriodEnd(subscription, now),
  };
}

export async function getEffectivePlanCodeForUser(
  userId: number,
): Promise<SubscriptionPlanCode> {
  await subscriptionRepository.ensureDefaultBasicSubscription(userId);
  await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
  const subscription =
    await subscriptionRepository.selectSubscriptionByUserId(userId);
  if (!subscription) {
    return "basic";
  }
  return resolveEffectivePlanCode(subscription);
}

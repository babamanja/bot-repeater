import * as subscriptionRepository from "../db/subscriptionRepository.js";
import * as paymentRepository from "../db/paymentRepository.js";
import * as paymentService from "./payment.service.js";
import {
  canCancelSubscription,
  canResumeSubscription,
  toSubscriptionView,
  type SubscriptionView,
} from "./subscriptionPlan.service.js";

async function loadMySubscriptionView(
  userId: number,
): Promise<SubscriptionView> {
  await subscriptionRepository.ensureDefaultBasicSubscription(userId);
  await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
  const subscription =
    await subscriptionRepository.selectSubscriptionByUserId(userId);
  if (!subscription) {
    const created =
      await subscriptionRepository.ensureDefaultBasicSubscription(userId);
    return toSubscriptionView(created);
  }
  return toSubscriptionView(subscription);
}

export async function getMySubscription(userId: number) {
  const subscription = await loadMySubscriptionView(userId);
  return { ok: true as const, subscription };
}

export async function cancelMySubscription(userId: number) {
  await subscriptionRepository.ensureDefaultBasicSubscription(userId);
  await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
  const subscription =
    await subscriptionRepository.selectSubscriptionByUserId(userId);
  if (!subscription) {
    return { ok: false as const, status: 404, error: "subscription not found" };
  }
  if (!canCancelSubscription(subscription)) {
    return {
      ok: false as const,
      status: 400,
      error: "cancel not available for this plan",
    };
  }
  if (subscription.status === "canceled") {
    return { ok: true as const, subscription: toSubscriptionView(subscription) };
  }
  const updated =
    await subscriptionRepository.cancelSubscriptionByUserId(userId);
  if (!updated) {
    return {
      ok: false as const,
      status: 400,
      error: "cancel not available for this plan",
    };
  }
  return { ok: true as const, subscription: toSubscriptionView(updated) };
}

export async function resumeMySubscription(userId: number) {
  await subscriptionRepository.ensureDefaultBasicSubscription(userId);
  await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
  const subscription =
    await subscriptionRepository.selectSubscriptionByUserId(userId);
  if (!subscription) {
    return { ok: false as const, status: 404, error: "subscription not found" };
  }
  if (!canResumeSubscription(subscription)) {
    return {
      ok: false as const,
      status: 400,
      error: "resume not available for this plan",
    };
  }
  if (subscription.status === "active") {
    return { ok: true as const, subscription: toSubscriptionView(subscription) };
  }
  const updated =
    await subscriptionRepository.resumeSubscriptionByUserId(userId);
  if (!updated) {
    return {
      ok: false as const,
      status: 400,
      error: "resume not available for this plan",
    };
  }
  return { ok: true as const, subscription: toSubscriptionView(updated) };
}

export async function activateMySubscription(
  userId: number,
  planCode: subscriptionRepository.SubscriptionPlanCode,
) {
  const subscription =
    await subscriptionRepository.activateSubscriptionByUserId(userId, planCode);
  return { ok: true as const, subscription: toSubscriptionView(subscription) };
}

export async function createMyCheckoutSession(
  userId: number,
  planCode: subscriptionRepository.SubscriptionPlanCode,
  appBaseUrl: string,
  checkoutType: "subscription" | "token_topup" = "subscription",
  tokenAmount?: unknown,
  billingPeriod?: unknown,
) {
  return await paymentService.createCheckoutSession(
    userId,
    planCode,
    appBaseUrl,
    checkoutType,
    tokenAmount,
    billingPeriod,
  );
}

export async function getMyPaymentStatus(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
) {
  return await paymentService.getPaymentStatus(userId, paymentId, appBaseUrl);
}

export async function syncMyPaymentFromPaddle(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
  paddleTransactionId?: string | null,
) {
  const result = await paymentService.syncPaymentFromPaddle(
    userId,
    paymentId,
    appBaseUrl,
    paddleTransactionId,
  );
  await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
  return result;
}

export async function abandonMyPendingPayment(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
  failureReason?: unknown,
) {
  return await paymentService.abandonPendingPayment(
    userId,
    paymentId,
    appBaseUrl,
    failureReason,
  );
}

export async function resolveMyPaymentFromPaddleTransaction(
  userId: number,
  paddleTransactionId: string,
) {
  return await paymentService.resolvePaymentIdFromPaddleTransaction(
    userId,
    paddleTransactionId,
  );
}

export async function listMyPayments(userId: number) {
  const payments = await paymentRepository.selectPaymentsByUserId(userId);
  return {
    ok: true as const,
    payments: payments.map((payment) => ({
      paymentId: payment.id,
      paymentType: payment.transactionType,
      date: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      status: payment.status,
      description: payment.description,
    })),
  };
}

export async function handlePaddleWebhook(input: {
  rawBody: Buffer | string;
  signatureHeader: string;
}) {
  const result = await paymentService.handlePaddleWebhook(input);
  await subscriptionRepository.downgradeExpiredCanceledPremium();
  return result;
}

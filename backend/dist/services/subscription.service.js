import * as subscriptionRepository from "../db/subscriptionRepository.js";
import * as paymentRepository from "../db/paymentRepository.js";
import * as paymentService from "./payment.service.js";
import { canCancelSubscription, canResumeSubscription, toSubscriptionView, } from "./subscriptionPlan.service.js";
async function loadMySubscriptionView(userId) {
    await subscriptionRepository.ensureDefaultBasicSubscription(userId);
    await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
    const subscription = await subscriptionRepository.selectSubscriptionByUserId(userId);
    if (!subscription) {
        const created = await subscriptionRepository.ensureDefaultBasicSubscription(userId);
        return toSubscriptionView(created);
    }
    return toSubscriptionView(subscription);
}
export async function getMySubscription(userId) {
    const subscription = await loadMySubscriptionView(userId);
    return { ok: true, subscription };
}
export async function cancelMySubscription(userId) {
    await subscriptionRepository.ensureDefaultBasicSubscription(userId);
    await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
    const subscription = await subscriptionRepository.selectSubscriptionByUserId(userId);
    if (!subscription) {
        return { ok: false, status: 404, error: "subscription not found" };
    }
    if (!canCancelSubscription(subscription)) {
        return {
            ok: false,
            status: 400,
            error: "cancel not available for this plan",
        };
    }
    if (subscription.status === "canceled") {
        return { ok: true, subscription: toSubscriptionView(subscription) };
    }
    const updated = await subscriptionRepository.cancelSubscriptionByUserId(userId);
    if (!updated) {
        return {
            ok: false,
            status: 400,
            error: "cancel not available for this plan",
        };
    }
    return { ok: true, subscription: toSubscriptionView(updated) };
}
export async function resumeMySubscription(userId) {
    await subscriptionRepository.ensureDefaultBasicSubscription(userId);
    await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
    const subscription = await subscriptionRepository.selectSubscriptionByUserId(userId);
    if (!subscription) {
        return { ok: false, status: 404, error: "subscription not found" };
    }
    if (!canResumeSubscription(subscription)) {
        return {
            ok: false,
            status: 400,
            error: "resume not available for this plan",
        };
    }
    if (subscription.status === "active") {
        return { ok: true, subscription: toSubscriptionView(subscription) };
    }
    const updated = await subscriptionRepository.resumeSubscriptionByUserId(userId);
    if (!updated) {
        return {
            ok: false,
            status: 400,
            error: "resume not available for this plan",
        };
    }
    return { ok: true, subscription: toSubscriptionView(updated) };
}
export async function activateMySubscription(userId, planCode) {
    const subscription = await subscriptionRepository.activateSubscriptionByUserId(userId, planCode);
    return { ok: true, subscription: toSubscriptionView(subscription) };
}
export async function createMyCheckoutSession(userId, planCode, appBaseUrl, checkoutType = "subscription", tokenAmount, billingPeriod) {
    return await paymentService.createCheckoutSession(userId, planCode, appBaseUrl, checkoutType, tokenAmount, billingPeriod);
}
export async function getMyPaymentStatus(userId, paymentId, appBaseUrl) {
    return await paymentService.getPaymentStatus(userId, paymentId, appBaseUrl);
}
export async function syncMyPaymentFromPaddle(userId, paymentId, appBaseUrl, paddleTransactionId) {
    const result = await paymentService.syncPaymentFromPaddle(userId, paymentId, appBaseUrl, paddleTransactionId);
    await subscriptionRepository.downgradeExpiredCanceledPremium(userId);
    return result;
}
export async function abandonMyPendingPayment(userId, paymentId, appBaseUrl, failureReason) {
    return await paymentService.abandonPendingPayment(userId, paymentId, appBaseUrl, failureReason);
}
export async function resolveMyPaymentFromPaddleTransaction(userId, paddleTransactionId) {
    return await paymentService.resolvePaymentIdFromPaddleTransaction(userId, paddleTransactionId);
}
export async function listMyPayments(userId) {
    const payments = await paymentRepository.selectPaymentsByUserId(userId);
    return {
        ok: true,
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
export async function handlePaddleWebhook(input) {
    const result = await paymentService.handlePaddleWebhook(input);
    await subscriptionRepository.downgradeExpiredCanceledPremium();
    return result;
}

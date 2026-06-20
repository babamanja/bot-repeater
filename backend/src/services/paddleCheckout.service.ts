import {
  getPaddleApiBaseUrl,
  getPaddlePriceId,
  type SubscriptionBillingPeriod,
} from "../config/paddle.js";
import * as paymentRepository from "../db/paymentRepository.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";
import { getEffectivePlanCodeForUser } from "./subscriptionPlan.service.js";
import {
  buildCheckoutUrl,
  buildPaymentReturnUrl,
  getRequiredEnv,
  normalizeAppBaseUrl,
} from "./paymentMetadata.js";
import {
  getSubscriptionAmount,
  getTokenTopupAmountUsd,
  parseBillingPeriod,
  parseTokenTopupAmount,
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
} from "./paymentPricing.js";

export const PADDLE_PROVIDER = "paddle";

export type CheckoutSession = {
  paymentId: string;
  planCode: subscriptionRepository.SubscriptionPlanCode;
  amount: number;
  currency: string;
  provider: string;
  status: paymentRepository.PaymentStatus;
  checkoutUrl: string;
};

export type CheckoutType = "subscription" | "token_topup";

type PaddleCheckoutResponse = {
  data?: {
    id?: string;
    checkout?: {
      url?: string;
    };
  };
};

async function createPaddleCheckout(input: {
  paymentId: string;
  userId: number;
  planCode: subscriptionRepository.SubscriptionPlanCode;
  appBaseUrl: string;
  checkoutType: CheckoutType;
  billingPeriod: SubscriptionBillingPeriod;
  tokenAmount?: number;
  applyPremiumTokenDiscount?: boolean;
}): Promise<{ checkoutUrl: string; providerTransactionId: string | null }> {
  const apiKey = getRequiredEnv("PADDLE_API_KEY");
  const priceId = getPaddlePriceId({
    checkoutType: input.checkoutType,
    planCode: input.planCode,
    billingPeriod: input.billingPeriod,
    tokenAmount: input.tokenAmount,
  });

  const appOrigin = normalizeAppBaseUrl(input.appBaseUrl);
  const successUrl = buildPaymentReturnUrl(input.appBaseUrl, input.paymentId);
  const cancelUrl =
    `${appOrigin.replace(/\/+$/, "")}` +
    `/payment?paymentId=${encodeURIComponent(input.paymentId)}&status=canceled`;

  const response = await fetch(`${getPaddleApiBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      items: [
        {
          price_id: priceId,
          quantity: 1,
        },
      ],
      ...(input.applyPremiumTokenDiscount
        ? {
            discount: {
              description: "Premium member token top-up discount",
              type: "percentage",
              amount: String(PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT),
            },
          }
        : {}),
      custom_data: {
        paymentId: input.paymentId,
        userId: input.userId,
        planCode: input.planCode,
        checkoutType: input.checkoutType,
        billingPeriod: input.billingPeriod,
        tokenAmount: input.tokenAmount ?? null,
      },
      collection_mode: "automatic",
      currency_code: "USD",
      checkout: {
        settings: {
          success_url: successUrl,
        },
      },
      metadata: {
        cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    let requestId: string | null = null;
    try {
      const parsed = JSON.parse(message) as { meta?: { request_id?: string } };
      requestId = parsed.meta?.request_id ?? null;
    } catch {
      requestId = null;
    }
    console.error("[payments] Paddle transaction create failed", {
      paymentId: input.paymentId,
      status: response.status,
      requestId,
      errorBody: message,
    });
    throw new Error(`Paddle checkout failed: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as PaddleCheckoutResponse;
  const checkoutUrl = payload.data?.checkout?.url?.trim();
  if (!checkoutUrl) {
    throw new Error("Paddle checkout url missing");
  }

  const providerTransactionId = payload.data?.id
    ? String(payload.data.id)
    : null;
  return { checkoutUrl, providerTransactionId };
}

export async function createCheckoutSession(
  userId: number,
  planCode: subscriptionRepository.SubscriptionPlanCode,
  appBaseUrl: string,
  checkoutType: CheckoutType = "subscription",
  tokenAmount?: unknown,
  billingPeriod?: unknown,
) {
  const normalizedBillingPeriod = parseBillingPeriod(billingPeriod);
  const normalizedTokenAmount =
    checkoutType === "token_topup"
      ? parseTokenTopupAmount(tokenAmount)
      : undefined;
  const applyPremiumTokenDiscount =
    checkoutType === "token_topup" &&
    (await getEffectivePlanCodeForUser(userId)) === "premium";
  const amount =
    checkoutType === "subscription"
      ? getSubscriptionAmount(planCode, normalizedBillingPeriod)
      : getTokenTopupAmountUsd(
          normalizedTokenAmount!,
          applyPremiumTokenDiscount,
        );
  const payment = await paymentRepository.createPendingSubscriptionPayment({
    userId,
    amount,
    currency: "USD",
    provider: PADDLE_PROVIDER,
    description:
      checkoutType === "subscription"
        ? `${planCode} ${normalizedBillingPeriod} subscription checkout`
        : `${normalizedTokenAmount} tokens topup checkout`,
    metadata: {
      flow:
        checkoutType === "subscription"
          ? "subscription_checkout"
          : "token_topup_checkout",
      planCode,
      billingPeriod: normalizedBillingPeriod,
      tokenAmount: normalizedTokenAmount,
      premiumDiscountApplied: applyPremiumTokenDiscount,
      premiumDiscountPercent: applyPremiumTokenDiscount
        ? PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT
        : null,
    },
  });

  let checkoutUrl = buildCheckoutUrl(appBaseUrl, payment.id);
  let providerTransactionId: string | null = null;
  const paddleCheckout = await createPaddleCheckout({
    paymentId: payment.id,
    userId,
    planCode,
    appBaseUrl,
    checkoutType,
    billingPeriod: normalizedBillingPeriod,
    tokenAmount: normalizedTokenAmount,
    applyPremiumTokenDiscount,
  });
  checkoutUrl = paddleCheckout.checkoutUrl;
  providerTransactionId = paddleCheckout.providerTransactionId;

  await paymentRepository.updatePendingPaymentCheckoutData({
    paymentId: payment.id,
    providerTransactionId,
    metadataPatch: {
      checkoutUrl,
      checkoutCreatedAt: new Date().toISOString(),
    },
  });

  const checkoutSession: CheckoutSession = {
    paymentId: payment.id,
    planCode,
    amount: payment.amount,
    currency: payment.currency,
    provider: PADDLE_PROVIDER,
    status: "pending",
    checkoutUrl,
  };

  return { ok: true as const, checkoutSession };
}

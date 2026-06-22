import { getPaddleApiBaseUrl } from "../config/paddle.js";
import * as paymentRepository from "../db/paymentRepository.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";
import { getPaddleWebhookVerificationFailure } from "../utils/paddleWebhookSignature.js";
import {
  getRequiredEnv,
  readBillingPeriod,
  readPlanCode,
} from "./paymentMetadata.js";

export type PaddleTransactionData = {
  id?: string;
  status?: string;
  custom_data?: Record<string, unknown>;
};

export type PaddleWebhookPayload = {
  event_type?: string;
  data?: PaddleTransactionData;
};

type PaddleTransactionResponse = {
  data?: PaddleTransactionData;
};

export function readPaymentIdFromPaddleTransaction(
  customData: Record<string, unknown> | undefined,
): string | null {
  const paymentId = customData?.paymentId;
  if (typeof paymentId === "string" && paymentId.length > 0) {
    return paymentId;
  }
  return null;
}

export function readPaymentIdFromWebhook(
  payload: PaddleWebhookPayload,
): string | null {
  return readPaymentIdFromPaddleTransaction(payload.data?.custom_data);
}

export function readProviderTransactionId(
  data: PaddleTransactionData | undefined,
): string {
  const dataId = data?.id;
  if (typeof dataId === "string" && dataId.length > 0) {
    return dataId;
  }
  return `paddle_${Date.now()}`;
}

function isPaddleTransactionSucceeded(
  eventName: string,
  status: string,
): boolean {
  return (
    eventName === "transaction.paid" ||
    eventName === "transaction.completed" ||
    status === "paid" ||
    status === "completed" ||
    status === "billed"
  );
}

function isPaddleTransactionFailed(eventName: string, status: string): boolean {
  return (
    eventName === "transaction.payment_failed" ||
    eventName === "transaction.canceled" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "failed"
  );
}

export function inferPaddleSyncEventName(status: string): string {
  if (status === "canceled") {
    return "transaction.canceled";
  }
  if (status === "past_due") {
    return "transaction.past_due";
  }
  return "";
}

function resolvePaddleFailureReason(
  eventName: string,
  status: string,
): string {
  if (
    eventName === "transaction.canceled" ||
    status === "canceled"
  ) {
    return "checkout_canceled";
  }
  if (eventName === "transaction.payment_failed") {
    return "provider_payment_failed";
  }
  return "provider_payment_failed";
}

export async function cancelPaddleTransactionIfPossible(
  transactionId: string,
): Promise<void> {
  const apiKey = getRequiredEnv("PADDLE_API_KEY");
  const normalized = transactionId.trim();
  if (!normalized.startsWith("txn_")) {
    return;
  }

  try {
    const response = await fetch(
      `${getPaddleApiBaseUrl()}/transactions/${encodeURIComponent(normalized)}`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ status: "canceled" }),
      },
    );
    if (!response.ok) {
      const message = await response.text();
      console.warn("[payments] Paddle transaction cancel failed", {
        transactionId: normalized,
        status: response.status,
        errorBody: message,
      });
    }
  } catch (error) {
    console.warn("[payments] Paddle transaction cancel request failed", {
      transactionId: normalized,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function applyPaddleTransactionToPayment(
  payment: paymentRepository.UserPaymentRow,
  input: {
    eventName?: string;
    status: string;
    providerTransactionId: string;
    metadataPatch: Record<string, unknown>;
  },
): Promise<void> {
  const eventName = input.eventName ?? "";
  const status = input.status;

  if (payment.status === "succeeded") {
    return;
  }

  if (
    payment.status === "failed" &&
    !isPaddleTransactionSucceeded(eventName, status)
  ) {
    return;
  }

  const planCode = readPlanCode(payment.metadata);
  const flow =
    typeof payment.metadata?.flow === "string"
      ? payment.metadata.flow
      : "subscription_checkout";

  if (isPaddleTransactionSucceeded(eventName, status)) {
    const updatedPayment = await paymentRepository.markPaymentSucceeded({
      paymentId: payment.id,
      providerTransactionId: input.providerTransactionId,
      metadataPatch: input.metadataPatch,
    });
    if (flow === "subscription_checkout") {
      await subscriptionRepository.activateSubscriptionFromPayment({
        userId: updatedPayment.userId,
        planCode,
        paymentId: updatedPayment.id,
        billingPeriod: readBillingPeriod(payment.metadata),
      });
    }
    return;
  }

  if (isPaddleTransactionFailed(eventName, status)) {
    const failureReason = resolvePaddleFailureReason(eventName, status);
    await paymentRepository.markPaymentFailed({
      paymentId: payment.id,
      metadataPatch: {
        ...input.metadataPatch,
        failureReason,
      },
    });
  }
}

export async function fetchPaddleTransaction(
  transactionId: string,
): Promise<PaddleTransactionData> {
  const apiKey = getRequiredEnv("PADDLE_API_KEY");
  const normalized = transactionId.trim();
  if (!normalized.startsWith("txn_")) {
    throw new Error("invalid paddle transaction id");
  }

  const response = await fetch(
    `${getPaddleApiBaseUrl()}/transactions/${encodeURIComponent(normalized)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    console.error("[payments] Paddle transaction fetch failed", {
      transactionId: normalized,
      status: response.status,
      errorBody: message,
    });
    throw new Error(`Paddle transaction fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as PaddleTransactionResponse;
  if (!payload.data) {
    throw new Error("Paddle transaction payload missing data");
  }
  return payload.data;
}

function safeJsonParse(value: Buffer | string): unknown {
  const asText = Buffer.isBuffer(value)
    ? value.toString("utf8")
    : String(value);
  return JSON.parse(asText);
}

export function verifyPaddleSignature(
  rawBody: Buffer | string,
  signatureHeader: string,
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim() ?? "";
  const failure = getPaddleWebhookVerificationFailure(
    rawBody,
    signatureHeader,
    secret,
  );
  if (failure) {
    console.warn("[payments] Paddle webhook signature verification failed", {
      reason: failure,
      bodyType: Buffer.isBuffer(rawBody) ? "buffer" : typeof rawBody,
      bodyLength: Buffer.isBuffer(rawBody)
        ? rawBody.length
        : rawBody.length,
    });
    return false;
  }
  return true;
}

export function parsePaddleWebhookPayload(rawBody: Buffer | string): PaddleWebhookPayload {
  return safeJsonParse(rawBody) as PaddleWebhookPayload;
}

import * as paymentRepository from "../db/paymentRepository.js";
import { PADDLE_PROVIDER } from "./paddleCheckout.service.js";
import {
  buildPaymentStatusResponse,
  resolveProviderTransactionIdForPayment,
} from "./paymentMetadata.js";
import {
  applyPaddleTransactionToPayment,
  cancelPaddleTransactionIfPossible,
  fetchPaddleTransaction,
  inferPaddleSyncEventName,
  readPaymentIdFromPaddleTransaction,
  readProviderTransactionId,
} from "./paddleTransactionSync.service.js";

export async function resolvePaymentIdFromPaddleTransaction(
  userId: number,
  paddleTransactionId: string,
) {
  const normalized = paddleTransactionId.trim();
  if (!normalized.startsWith("txn_")) {
    throw new Error("invalid paddleTransactionId");
  }

  const payment =
    await paymentRepository.selectPaymentByProviderTransactionIdForUser(
      normalized,
      userId,
    );
  if (!payment) {
    throw new Error("payment not found");
  }

  return { ok: true as const, paymentId: payment.id };
}

export async function getPaymentStatus(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
) {
  const payment = await paymentRepository.selectPaymentByIdForUser(
    paymentId,
    userId,
  );
  if (!payment) {
    throw new Error("payment not found");
  }

  return {
    ok: true as const,
    payment: buildPaymentStatusResponse(payment, appBaseUrl),
  };
}

export async function syncPaymentFromPaddle(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
  paddleTransactionId?: string | null,
) {
  let payment = await paymentRepository.selectPaymentByIdForUser(
    paymentId,
    userId,
  );
  if (!payment) {
    throw new Error("payment not found");
  }
  if (payment.provider !== PADDLE_PROVIDER) {
    throw new Error("unsupported payment provider");
  }
  if (payment.status === "succeeded" || payment.status === "failed") {
    return {
      ok: true as const,
      payment: buildPaymentStatusResponse(payment, appBaseUrl),
    };
  }

  const providerTransactionId = resolveProviderTransactionIdForPayment(
    payment,
    paddleTransactionId,
  );
  if (!providerTransactionId) {
    throw new Error("provider transaction id missing");
  }

  if (!payment.providerTransactionId) {
    payment = await paymentRepository.updatePendingPaymentCheckoutData({
      paymentId: payment.id,
      providerTransactionId,
      metadataPatch: {},
    });
  }

  const paddleTransaction = await fetchPaddleTransaction(providerTransactionId);
  const linkedPaymentId = readPaymentIdFromPaddleTransaction(
    paddleTransaction.custom_data,
  );
  if (linkedPaymentId && linkedPaymentId !== payment.id) {
    throw new Error("payment id mismatch");
  }

  const paddleStatus = paddleTransaction.status ?? "";
  await applyPaddleTransactionToPayment(payment, {
    eventName: inferPaddleSyncEventName(paddleStatus),
    status: paddleStatus,
    providerTransactionId: readProviderTransactionId(paddleTransaction),
    metadataPatch: {
      syncSource: "paddle_api",
      paddleStatus,
      syncedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  const updatedPayment = await paymentRepository.selectPaymentByIdForUser(
    paymentId,
    userId,
  );
  if (!updatedPayment) {
    throw new Error("payment not found");
  }

  return {
    ok: true as const,
    payment: buildPaymentStatusResponse(updatedPayment, appBaseUrl),
  };
}

const ALLOWED_ABANDON_FAILURE_REASONS = new Set([
  "checkout_canceled",
  "checkout_abandoned",
]);

function normalizeAbandonFailureReason(rawValue: unknown): string {
  if (
    typeof rawValue === "string" &&
    ALLOWED_ABANDON_FAILURE_REASONS.has(rawValue.trim())
  ) {
    return rawValue.trim();
  }
  return "checkout_canceled";
}

export async function abandonPendingPayment(
  userId: number,
  paymentId: string,
  appBaseUrl: string,
  failureReason?: unknown,
) {
  let payment = await paymentRepository.selectPaymentByIdForUser(
    paymentId,
    userId,
  );
  if (!payment) {
    throw new Error("payment not found");
  }
  if (payment.status === "succeeded" || payment.status === "failed") {
    return {
      ok: true as const,
      payment: buildPaymentStatusResponse(payment, appBaseUrl),
    };
  }

  const resolvedFailureReason = normalizeAbandonFailureReason(failureReason);
  const providerTransactionId = resolveProviderTransactionIdForPayment(payment);
  if (providerTransactionId) {
    await cancelPaddleTransactionIfPossible(providerTransactionId);
    try {
      const paddleTransaction = await fetchPaddleTransaction(
        providerTransactionId,
      );
      const linkedPaymentId = readPaymentIdFromPaddleTransaction(
        paddleTransaction.custom_data,
      );
      if (linkedPaymentId && linkedPaymentId !== payment.id) {
        throw new Error("payment id mismatch");
      }

      const paddleStatus = paddleTransaction.status ?? "";
      await applyPaddleTransactionToPayment(payment, {
        eventName: inferPaddleSyncEventName(paddleStatus),
        status: paddleStatus,
        providerTransactionId: readProviderTransactionId(paddleTransaction),
        metadataPatch: {
          syncSource: "abandon",
          abandonedAt: new Date().toISOString(),
          failureReason: resolvedFailureReason,
        },
      });
    } catch (error) {
      console.warn("[payments] Paddle abandon sync failed", {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  payment = await paymentRepository.selectPaymentByIdForUser(paymentId, userId);
  if (!payment) {
    throw new Error("payment not found");
  }
  if (payment.status === "pending") {
    await paymentRepository.markPaymentFailed({
      paymentId: payment.id,
      metadataPatch: {
        syncSource: "abandon",
        abandonedAt: new Date().toISOString(),
        failureReason: resolvedFailureReason,
      },
    });
    payment = await paymentRepository.selectPaymentByIdForUser(paymentId, userId);
    if (!payment) {
      throw new Error("payment not found");
    }
  }

  return {
    ok: true as const,
    payment: buildPaymentStatusResponse(payment, appBaseUrl),
  };
}

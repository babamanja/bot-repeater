import {
  getMyPaymentStatus,
  syncPaymentFromPaddle,
  type SubscriptionPayment,
  type SubscriptionPaymentStatus,
} from "../api/subscription";

const TERMINAL_STATUSES: ReadonlySet<SubscriptionPaymentStatus> = new Set([
  "succeeded",
  "failed",
  "refunded",
]);

export type PollPaymentResult =
  | { status: "succeeded"; payment: SubscriptionPayment }
  | { status: "failed"; payment: SubscriptionPayment }
  | { status: "refunded"; payment: SubscriptionPayment }
  | { status: "timeout"; payment: SubscriptionPayment };

export async function pollPaymentUntilSettled(
  paymentId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
  },
): Promise<PollPaymentResult> {
  const intervalMs = options?.intervalMs ?? 1500;
  const maxAttempts = options?.maxAttempts ?? 40;

  let lastPayment: SubscriptionPayment | null = null;

  try {
    lastPayment = await syncPaymentFromPaddle(paymentId);
    if (TERMINAL_STATUSES.has(lastPayment.status)) {
      if (lastPayment.status === "succeeded") {
        return { status: "succeeded", payment: lastPayment };
      }
      if (lastPayment.status === "failed") {
        return { status: "failed", payment: lastPayment };
      }
      return { status: "refunded", payment: lastPayment };
    }
  } catch {
    // Webhook may still arrive; continue polling below.
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    lastPayment = await getMyPaymentStatus(paymentId);
    if (TERMINAL_STATUSES.has(lastPayment.status)) {
      if (lastPayment.status === "succeeded") {
        return { status: "succeeded", payment: lastPayment };
      }
      if (lastPayment.status === "failed") {
        return { status: "failed", payment: lastPayment };
      }
      return { status: "refunded", payment: lastPayment };
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  if (!lastPayment) {
    throw new Error("payment not found");
  }
  return { status: "timeout", payment: lastPayment };
}

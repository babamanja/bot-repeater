export type PaymentResultOutcome = "success" | "failed" | "canceled" | "pending";

const OUTCOME_TO_PATH: Record<PaymentResultOutcome, string> = {
  success: "/payment/success",
  failed: "/payment/failed",
  canceled: "/payment/canceled",
  pending: "/payment/pending",
};

export function paymentCheckoutPath(paymentId: string): string {
  return `/payment/checkout?paymentId=${encodeURIComponent(paymentId)}`;
}

export function paymentResultPath(
  outcome: PaymentResultOutcome,
  paymentId: string,
): string {
  const query = new URLSearchParams({ paymentId });
  return `${OUTCOME_TO_PATH[outcome]}?${query.toString()}`;
}

const CANCELED_FAILURE_REASONS = new Set([
  "checkout_canceled",
  "checkout_abandoned",
  "checkout_closed",
]);

export function isCanceledFailureReason(
  failureReason: string | null | undefined,
): boolean {
  const normalized = failureReason?.trim();
  return Boolean(normalized && CANCELED_FAILURE_REASONS.has(normalized));
}

export function paymentOutcomeFromStatus(
  status: string,
  options?: { failureReason?: string | null },
): PaymentResultOutcome | null {
  if (status === "succeeded") {
    return "success";
  }
  if (status === "failed") {
    if (isCanceledFailureReason(options?.failureReason)) {
      return "canceled";
    }
    return "failed";
  }
  if (status === "pending") {
    return "pending";
  }
  return null;
}

/** Terminal outcomes only — excludes pending (checkout must open Paddle instead). */
export function paymentTerminalOutcomeFromStatus(
  status: string,
  options?: { failureReason?: string | null },
): PaymentResultOutcome | null {
  const outcome = paymentOutcomeFromStatus(status, options);
  return outcome === "pending" ? null : outcome;
}

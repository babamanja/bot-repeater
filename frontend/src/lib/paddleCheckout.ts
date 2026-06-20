import {
  CheckoutEventNames,
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";

type PaddleCheckoutHandlers = {
  onCompleted?: () => void;
  onClosed?: () => void;
  onError?: (message: string) => void;
};

let paddleInstancePromise: Promise<Paddle | undefined> | null = null;

function getPaddleClientToken(): string {
  return import.meta.env.VITE_PADDLE_CLIENT_TOKEN?.trim() ?? "";
}

function getPaddleEnvironment(): "sandbox" | "production" {
  const raw = import.meta.env.VITE_PADDLE_ENV?.trim().toLowerCase();
  if (raw === "live" || raw === "production" || raw === "prod") {
    return "production";
  }
  return "sandbox";
}

export function isPaddleConfigured(): boolean {
  return getPaddleClientToken().length > 0;
}

export async function getPaddle(): Promise<Paddle | undefined> {
  if (!paddleInstancePromise) {
    const token = getPaddleClientToken();
    if (!token) {
      console.warn("[paddle] VITE_PADDLE_CLIENT_TOKEN is not set");
      paddleInstancePromise = Promise.resolve(undefined);
    } else {
      paddleInstancePromise = initializePaddle({
        environment: getPaddleEnvironment(),
        token,
      });
    }
  }
  return paddleInstancePromise;
}

export function extractPaddleTransactionId(
  checkoutUrl: string | null | undefined,
): string | null {
  const raw = checkoutUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw, window.location.origin);
    return url.searchParams.get("_ptxn")?.trim() || null;
  } catch {
    return null;
  }
}

export async function openPaddleCheckoutForTransaction(
  transactionId: string,
  handlers: PaddleCheckoutHandlers = {},
): Promise<void> {
  const normalizedTransactionId = transactionId.trim();
  if (!normalizedTransactionId.startsWith("txn_")) {
    throw new Error("invalid paddle transaction id");
  }

  const paddle = await getPaddle();
  if (!paddle) {
    throw new Error("paddle_not_configured");
  }

  let checkoutCompleted = false;

  paddle.Update({
    eventCallback: (event: PaddleEventData) => {
      const name = event.name;
      if (name === CheckoutEventNames.CHECKOUT_COMPLETED) {
        checkoutCompleted = true;
        handlers.onCompleted?.();
        return;
      }
      if (name === CheckoutEventNames.CHECKOUT_CLOSED) {
        if (!checkoutCompleted) {
          handlers.onClosed?.();
        }
        return;
      }
      if (
        name === CheckoutEventNames.CHECKOUT_ERROR ||
        name === CheckoutEventNames.CHECKOUT_FAILED ||
        name === CheckoutEventNames.CHECKOUT_PAYMENT_FAILED
      ) {
        handlers.onError?.(event.detail ?? "checkout_failed");
      }
    },
  });

  paddle.Checkout.open({
    transactionId: normalizedTransactionId,
    settings: {
      displayMode: "overlay",
    },
  });
}

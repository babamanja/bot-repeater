import { isTokenTopupAmount } from "../config/paddle.js";
export function normalizeAppBaseUrl(appBaseUrl) {
    const fallback = "http://127.0.0.1:5173";
    const raw = appBaseUrl.trim();
    if (!raw) {
        return fallback;
    }
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    try {
        const parsed = new URL(withProtocol);
        const isLocalhost = parsed.hostname === "localhost";
        const isLoopback = parsed.hostname === "127.0.0.1";
        if (isLocalhost || isLoopback) {
            const port = parsed.port || "5173";
            return `http://127.0.0.1:${port}`;
        }
        return parsed.origin;
    }
    catch {
        return fallback;
    }
}
export function buildPaymentReturnUrl(appBaseUrl, paymentId) {
    const normalizedBaseUrl = normalizeAppBaseUrl(appBaseUrl).replace(/\/+$/, "");
    return `${normalizedBaseUrl}/payment?paymentId=${encodeURIComponent(paymentId)}`;
}
export function buildCheckoutUrl(appBaseUrl, paymentId) {
    return buildPaymentReturnUrl(appBaseUrl, paymentId);
}
export function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required`);
    }
    return value;
}
export function readPlanCode(metadata) {
    const raw = metadata?.planCode;
    if (typeof raw === "string" && raw.toLowerCase() === "premium") {
        return "premium";
    }
    return "basic";
}
export function readBillingPeriod(metadata) {
    const raw = metadata?.billingPeriod;
    if (raw === "yearly") {
        return "yearly";
    }
    return "monthly";
}
export function readTokenTopupAmountFromMetadata(metadata) {
    const amount = Number(metadata?.tokenAmount);
    if (!Number.isInteger(amount) || amount <= 0 || !isTokenTopupAmount(amount)) {
        return null;
    }
    return amount;
}
export function readFailureReason(metadata) {
    const reason = metadata?.failureReason;
    return typeof reason === "string" && reason.length > 0 ? reason : null;
}
export function readCheckoutUrl(metadata) {
    const checkoutUrl = metadata?.checkoutUrl;
    return typeof checkoutUrl === "string" && checkoutUrl.length > 0
        ? checkoutUrl
        : null;
}
export function extractPaddleTransactionIdFromCheckoutUrl(checkoutUrl) {
    const raw = checkoutUrl?.trim();
    if (!raw) {
        return null;
    }
    try {
        const url = new URL(raw, "http://localhost");
        const transactionId = url.searchParams.get("_ptxn")?.trim();
        if (transactionId?.startsWith("txn_")) {
            return transactionId;
        }
    }
    catch {
        return null;
    }
    return null;
}
export function resolveProviderTransactionIdForPayment(payment, override) {
    const explicit = override?.trim();
    if (explicit?.startsWith("txn_")) {
        return explicit;
    }
    const stored = payment.providerTransactionId?.trim();
    if (stored?.startsWith("txn_")) {
        return stored;
    }
    return extractPaddleTransactionIdFromCheckoutUrl(readCheckoutUrl(payment.metadata));
}
export function buildPaymentStatusResponse(payment, appBaseUrl) {
    const planCode = readPlanCode(payment.metadata);
    const shouldAllowResume = payment.status === "pending";
    return {
        paymentId: payment.id,
        paymentType: payment.transactionType,
        date: payment.createdAt,
        planCode,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        status: payment.status,
        checkoutUrl: shouldAllowResume
            ? (readCheckoutUrl(payment.metadata) ??
                buildCheckoutUrl(appBaseUrl, payment.id))
            : null,
        failureReason: readFailureReason(payment.metadata),
    };
}

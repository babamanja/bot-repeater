import * as paymentRepository from "../db/paymentRepository.js";
import { PADDLE_PROVIDER } from "./paddleCheckout.service.js";
import { applyPaddleTransactionToPayment, parsePaddleWebhookPayload, readPaymentIdFromWebhook, readProviderTransactionId, verifyPaddleSignature, } from "./paddleTransactionSync.service.js";
export async function handlePaddleWebhook(input) {
    if (!verifyPaddleSignature(input.rawBody, input.signatureHeader)) {
        console.warn("[payments] Paddle webhook signature verification failed");
        throw new Error("invalid webhook signature");
    }
    const payload = parsePaddleWebhookPayload(input.rawBody);
    const paymentId = readPaymentIdFromWebhook(payload);
    if (!paymentId) {
        console.error("[payments] Paddle webhook missing paymentId", {
            eventType: payload.event_type ?? null,
            providerTransactionId: payload.data?.id ?? null,
        });
        throw new Error("paymentId missing in webhook");
    }
    const payment = await paymentRepository.selectPaymentById(paymentId);
    if (!payment) {
        console.error("[payments] Paddle webhook payment not found", { paymentId });
        throw new Error("payment not found");
    }
    if (payment.provider !== PADDLE_PROVIDER) {
        console.error("[payments] Paddle webhook provider mismatch", {
            paymentId,
            provider: payment.provider,
        });
        throw new Error("unsupported payment provider");
    }
    await applyPaddleTransactionToPayment(payment, {
        eventName: payload.event_type ?? "",
        status: payload.data?.status ?? "",
        providerTransactionId: readProviderTransactionId(payload.data),
        metadataPatch: {
            syncSource: "webhook",
            webhookEvent: payload.event_type ?? null,
            completedAt: new Date().toISOString(),
        },
    });
    return { ok: true };
}

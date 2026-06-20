import { randomBytes } from "node:crypto";
import { getPrisma } from "../db/prisma.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";
const LINK_CODE_TTL_MS = 15 * 60 * 1000;
function generateLinkCode() {
    return randomBytes(5).toString("hex");
}
export async function createTelegramLinkCode(userId) {
    const code = generateLinkCode();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
    await getPrisma().telegramLinkCode.create({
        data: { userId, code, expiresAt },
    });
    return { code, expiresAt: expiresAt.toISOString() };
}
export async function ensureTelegramUser(input) {
    const existing = await getPrisma().user.findFirst({
        where: { telegramId: input.telegramId, deletedAt: null },
        select: { id: true },
    });
    if (existing) {
        return { userId: existing.id, isNew: false };
    }
    const user = await getPrisma().user.create({
        data: {
            userName: input.userName,
            telegramId: input.telegramId,
            telegramUsername: input.telegramUsername ?? null,
        },
    });
    await subscriptionRepository.ensureDefaultBasicSubscription(user.id);
    return { userId: user.id, isNew: true };
}
export async function recordTelegramStarsPayment(input) {
    const payment = await getPrisma().payment.create({
        data: {
            userId: input.userId,
            amount: input.amount,
            currency: input.currency,
            status: "succeeded",
            provider: "telegram_stars",
            providerTransactionId: input.providerTransactionId,
            transactionType: "payment",
            description: `Premium subscription (${input.billingPeriod}) via Telegram Stars`,
            metadata: { billingPeriod: input.billingPeriod, source: "telegram_stars" },
        },
    });
    await subscriptionRepository.activateSubscriptionFromPayment({
        userId: input.userId,
        planCode: "premium",
        paymentId: payment.id,
        billingPeriod: input.billingPeriod,
    });
}

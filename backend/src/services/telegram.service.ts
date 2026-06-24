import { getPrisma } from "../db/prisma.js";
import * as dictionaryRepository from "../db/dictionaryRepository.js";
import * as subscriptionRepository from "../db/subscriptionRepository.js";
import { createTelegramLinkCode as createLinkCodeRecord } from "./telegramLink.service.js";

export async function createTelegramLinkCode(userId: number): Promise<{ code: string; expiresAt: string }> {
  return createLinkCodeRecord(userId, "web");
}

export type TelegramLinkStatus = {
  linked: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
};

export async function getTelegramLinkStatus(
  userId: number,
): Promise<{ ok: true; status: TelegramLinkStatus } | { ok: false; status: number; error: string }> {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const user = await getPrisma().user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { telegramId: true, telegramUsername: true },
  });
  if (!user) {
    return { ok: false, status: 404, error: "user not found" };
  }
  return {
    ok: true,
    status: {
      linked: user.telegramId != null,
      telegramId: user.telegramId != null ? user.telegramId.toString() : null,
      telegramUsername: user.telegramUsername,
    },
  };
}

export async function unlinkTelegram(
  userId: number,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const user = await getPrisma().user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      telegramId: true,
      email: true,
      auth: { select: { passwordHash: true, googleSub: true } },
    },
  });
  if (!user) {
    return { ok: false, status: 404, error: "user not found" };
  }
  if (user.telegramId == null) {
    return { ok: false, status: 400, error: "telegram_not_linked" };
  }
  const hasWebLogin =
    Boolean(user.email?.trim()) ||
    Boolean(user.auth?.passwordHash) ||
    Boolean(user.auth?.googleSub);
  if (!hasWebLogin) {
    return { ok: false, status: 400, error: "cannot_unlink_only_login_method" };
  }
  await getPrisma().user.update({
    where: { id: userId },
    data: { telegramId: null, telegramUsername: null },
  });
  return { ok: true };
}

export async function ensureTelegramUser(input: {
  telegramId: bigint;
  userName: string;
  telegramUsername?: string | null;
}): Promise<{ userId: number; isNew: boolean }> {
  const existing = await getPrisma().user.findFirst({
    where: { telegramId: input.telegramId, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    await dictionaryRepository.ensureDefaultDictionaryForUser(existing.id);
    return { userId: existing.id, isNew: false };
  }

  const user = await getPrisma().user.create({
    data: {
      userName: input.userName,
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername ?? null,
    },
  });
  await dictionaryRepository.ensureDefaultDictionaryForUser(user.id);
  await subscriptionRepository.ensureDefaultBasicSubscription(user.id);
  return { userId: user.id, isNew: true };
}

export async function recordTelegramStarsPayment(input: {
  userId: number;
  amount: number;
  currency: string;
  providerTransactionId: string;
  billingPeriod: "monthly" | "yearly";
}): Promise<void> {
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

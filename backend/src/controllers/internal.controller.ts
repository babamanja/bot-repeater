import type { Request, Response } from "express";
import * as telegramService from "../services/telegram.service.js";
import * as telegramLinkService from "../services/telegramLink.service.js";

function buildTelegramProfile(body: Record<string, unknown>) {
  let telegramId: bigint;
  try {
    telegramId = BigInt(String(body.telegramId));
  } catch {
    return null;
  }
  const userName = typeof body.userName === "string" ? body.userName.trim() : "";
  if (!userName) {
    return null;
  }
  const telegramUsername =
    typeof body.telegramUsername === "string" ? body.telegramUsername.trim() : null;
  return {
    telegramId,
    telegramUsername,
    displayName: userName,
  };
}

function parseLanguageSource(value: unknown): "web" | "telegram" | undefined {
  if (value === "web" || value === "telegram") {
    return value;
  }
  return undefined;
}

function buildProfileUrl(): string | null {
  const raw = process.env.AUTH_PUBLIC_APP_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    return new URL("/profile", raw).toString();
  } catch {
    return null;
  }
}

export async function ensureTelegramUser(req: Request, res: Response) {
  const telegramIdRaw = req.body?.telegramId;
  const userName = typeof req.body?.userName === "string" ? req.body.userName.trim() : "";
  const telegramUsername =
    typeof req.body?.telegramUsername === "string" ? req.body.telegramUsername.trim() : null;

  let telegramId: bigint;
  try {
    telegramId = BigInt(String(telegramIdRaw));
  } catch {
    return res.status(400).json({ error: "invalid telegramId" });
  }
  if (!userName) {
    return res.status(400).json({ error: "userName is required" });
  }

  const result = await telegramService.ensureTelegramUser({
    telegramId,
    userName,
    telegramUsername,
  });
  return res.status(200).json(result);
}

export async function recordTelegramStarsPayment(req: Request, res: Response) {
  const userId = Number(req.body?.userId);
  const amount = Number(req.body?.amount);
  const currency = typeof req.body?.currency === "string" ? req.body.currency : "XTR";
  const providerTransactionId =
    typeof req.body?.providerTransactionId === "string"
      ? req.body.providerTransactionId.trim()
      : "";
  const billingPeriod = req.body?.billingPeriod === "yearly" ? "yearly" : "monthly";

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "invalid userId" });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "invalid amount" });
  }
  if (!providerTransactionId) {
    return res.status(400).json({ error: "providerTransactionId is required" });
  }

  await telegramService.recordTelegramStarsPayment({
    userId,
    amount,
    currency,
    providerTransactionId,
    billingPeriod,
  });
  return res.status(200).json({ ok: true });
}

export async function createTelegramLinkCode(req: Request, res: Response) {
  const userId = Number(req.body?.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "invalid userId" });
  }

  const telegramOnly = await telegramLinkService.isTelegramOnlyUser(userId);
  if (!telegramOnly) {
    return res.status(400).json({ error: "user_already_has_web_login" });
  }

  const result = await telegramLinkService.createTelegramLinkCode(userId, "telegram");
  return res.status(200).json({
    code: result.code,
    expiresAt: result.expiresAt,
    profileUrl: buildProfileUrl(),
  });
}

export async function completeTelegramLink(req: Request, res: Response) {
  const profile = buildTelegramProfile(req.body ?? {});
  if (!profile) {
    return res.status(400).json({ error: "invalid telegram profile" });
  }

  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const languageSource = parseLanguageSource(req.body?.languageSource);
  const result = await telegramLinkService.completeTelegramLinkFromBot({
    code,
    profile,
    languageSource,
  });

  if (result.ok) {
    return res.status(200).json({ ok: true, userId: result.userId });
  }
  if ("needsLanguageChoice" in result && result.needsLanguageChoice) {
    return res.status(409).json({
      error: "language_choice_required",
      languageOptions: result.languageOptions,
    });
  }
  return res.status(400).json({
    error: "error" in result ? result.error : "link failed",
  });
}

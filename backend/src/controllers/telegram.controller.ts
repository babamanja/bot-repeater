import type { Request, Response } from "express";
import { getRequiredUserId, sendServiceFailure, sendUnauthorized } from "./helpers.js";
import * as telegramService from "../services/telegram.service.js";
import * as telegramLinkService from "../services/telegramLink.service.js";

function buildDeepLink(code: string): string | null {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return botUsername ? `https://t.me/${botUsername}?start=link_${code}` : null;
}

function parseLanguageSource(value: unknown): "web" | "telegram" | undefined {
  if (value === "web" || value === "telegram") {
    return value;
  }
  return undefined;
}

export async function getMyTelegramLink(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId == null) {
    return sendUnauthorized(res);
  }
  const result = await telegramService.getTelegramLinkStatus(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(200).json(result.status);
}

export async function createMyTelegramLinkCode(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId == null) {
    return sendUnauthorized(res);
  }

  const existing = await telegramService.createTelegramLinkCode(userId);
  const deepLink = buildDeepLink(existing.code);

  return res.status(200).json({
    code: existing.code,
    expiresAt: existing.expiresAt,
    deepLink,
  });
}

export async function unlinkMyTelegram(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId == null) {
    return sendUnauthorized(res);
  }
  const result = await telegramService.unlinkTelegram(userId);
  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }
  return res.status(204).send();
}

export async function claimMyTelegramLinkCode(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId == null) {
    return sendUnauthorized(res);
  }

  const code = typeof req.body?.code === "string" ? req.body.code : "";
  const languageSource = parseLanguageSource(req.body?.languageSource);
  const result = await telegramLinkService.claimTelegramLinkCodeFromWeb({
    webUserId: userId,
    code,
    languageSource,
  });

  if (result.ok) {
    return res.status(200).json({ ok: true });
  }
  if ("needsLanguageChoice" in result && result.needsLanguageChoice) {
    return res.status(result.status).json({
      error: "language_choice_required",
      languageOptions: result.languageOptions,
    });
  }
  if ("error" in result) {
    return sendServiceFailure(res, result);
  }
  return res.status(500).json({ error: "claim failed" });
}

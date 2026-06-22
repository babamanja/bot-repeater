import type { Request, Response } from "express";
import { getRequiredUserId, sendServiceFailure, sendUnauthorized } from "./helpers.js";
import * as telegramService from "../services/telegram.service.js";

function buildDeepLink(code: string): string | null {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
  return botUsername ? `https://t.me/${botUsername}?start=link_${code}` : null;
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

import type { Request, Response } from "express";
import { getRequiredUserId, sendUnauthorized } from "./helpers.js";
import * as telegramService from "../services/telegram.service.js";

export async function createMyTelegramLinkCode(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId == null) {
    return sendUnauthorized(res);
  }

  const existing = await telegramService.createTelegramLinkCode(userId);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.trim();
  const deepLink = botUsername
    ? `https://t.me/${botUsername}?start=link_${existing.code}`
    : null;

  return res.status(200).json({
    code: existing.code,
    expiresAt: existing.expiresAt,
    deepLink,
  });
}

import type { Request, Response } from "express";

import * as tokenService from "../services/token.service.js";
import {
  getRequiredUserId,
  sendServiceFailure,
  sendUnauthorized,
} from "./helpers.js";

export async function getMyTokenBalance(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const result = await tokenService.getMyTokenBalance(userId);
  return res.status(200).json({ balance: result.balance });
}

export async function purchaseMyTokens(req: Request, res: Response) {
  const userId = getRequiredUserId(req);
  if (userId === null) {
    return sendUnauthorized(res);
  }

  const result = await tokenService.purchaseTokens(userId, {
    amount: req.body?.amount,
    idempotencyKey: req.body?.idempotencyKey,
  });

  if (result.ok === false) {
    return sendServiceFailure(res, result);
  }

  return res.status(200).json({
    balance: result.balance,
    purchasedAmount: result.purchasedAmount,
  });
}

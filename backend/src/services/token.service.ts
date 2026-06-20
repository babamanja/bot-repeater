import * as tokenRepository from "../db/tokenRepository.js";

function toSafeNumber(value: bigint): number {
  return Number(value);
}

export async function getMyTokenBalance(userId: number) {
  const balance = await tokenRepository.selectTokenBalanceByUserId(userId);
  return { ok: true as const, balance: toSafeNumber(balance) };
}

export async function purchaseTokens(
  userId: number,
  input: { amount: unknown; idempotencyKey?: unknown },
) {
  const amount = Number(input.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false as const,
      status: 400,
      error: "amount must be a positive integer",
    };
  }

  const idempotencyKey =
    typeof input.idempotencyKey === "string" &&
    input.idempotencyKey.trim().length > 0
      ? input.idempotencyKey.trim()
      : undefined;

  try {
    const result = await tokenRepository.addTokensForUser({
      userId,
      amount,
      transactionType: "purchase",
      idempotencyKey,
      metadata: { source: "manual_tokens_purchase" },
    });

    return {
      ok: true as const,
      balance: toSafeNumber(result.balance),
      purchasedAmount: amount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to purchase tokens";
    if (message.includes("idempotency_key")) {
      return {
        ok: false as const,
        status: 409,
        error: "duplicate idempotency key",
      };
    }
    return {
      ok: false as const,
      status: 500,
      error: "failed to purchase tokens",
    };
  }
}

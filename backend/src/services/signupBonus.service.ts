import * as tokenRepository from "../db/tokenRepository.js";

const DEFAULT_SIGNUP_BONUS_TOKENS = 30;

function getSignupBonusTokens(): number {
  const raw = process.env.SIGNUP_BONUS_TOKENS?.trim();
  if (!raw) {
    return DEFAULT_SIGNUP_BONUS_TOKENS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return DEFAULT_SIGNUP_BONUS_TOKENS;
  }
  return parsed;
}

export async function grantSignupBonusTokens(userId: number): Promise<void> {
  const signupBonusTokens = getSignupBonusTokens();
  if (signupBonusTokens <= 0) {
    return;
  }

  try {
    await tokenRepository.addTokensForUserIdempotent({
      userId,
      amount: signupBonusTokens,
      transactionType: "bonus",
      idempotencyKey: `signup_bonus:${userId}`,
      metadata: { reason: "signup_bonus" },
    });
  } catch (error) {
    console.error("[auth] Failed to grant signup bonus tokens", { userId, error });
  }
}

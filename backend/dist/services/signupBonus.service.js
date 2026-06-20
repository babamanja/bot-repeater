import * as tokenRepository from "../db/tokenRepository.js";
import { getGenerationSettings } from "./generationSettings.service.js";
export async function grantSignupBonusTokens(userId) {
    const { signupBonusTokens } = await getGenerationSettings();
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
    }
    catch (error) {
        console.error("[auth] Failed to grant signup bonus tokens", { userId, error });
    }
}

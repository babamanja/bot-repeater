export declare const PREMIUM_USD_MONTHLY = 9.99;
export declare const PREMIUM_USD_YEARLY = 99;
export declare const PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT = 30;
/** Telegram Stars price for in-bot Premium checkout. */
export declare const TELEGRAM_STARS_PREMIUM_MONTHLY = 250;
export declare const TELEGRAM_STARS_PREMIUM_YEARLY = 2500;
export declare const TOKEN_TOPUP_AMOUNTS: readonly [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
export type TokenTopupAmount = (typeof TOKEN_TOPUP_AMOUNTS)[number];
export declare const TOKEN_PACK_PRICES_USD: Record<TokenTopupAmount, number>;
export declare function isTokenTopupAmount(value: number): value is TokenTopupAmount;
export declare function getTokenTopupAmountUsd(tokenAmount: number, applyPremiumDiscount?: boolean): number;
//# sourceMappingURL=pricing.d.ts.map
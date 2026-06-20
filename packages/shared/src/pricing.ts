export const PREMIUM_USD_MONTHLY = 9.99;
export const PREMIUM_USD_YEARLY = 99;
export const PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT = 30;

/** Telegram Stars price for in-bot Premium checkout. */
export const TELEGRAM_STARS_PREMIUM_MONTHLY = 250;
export const TELEGRAM_STARS_PREMIUM_YEARLY = 2500;

export const TOKEN_TOPUP_AMOUNTS = [
  10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
] as const;

export type TokenTopupAmount = (typeof TOKEN_TOPUP_AMOUNTS)[number];

export const TOKEN_PACK_PRICES_USD: Record<TokenTopupAmount, number> = {
  10: 0.99,
  25: 1.99,
  50: 3.49,
  100: 5.99,
  250: 12.99,
  500: 19.99,
  1000: 34.99,
  2500: 69.99,
  5000: 119.99,
  10000: 199.99,
};

export function isTokenTopupAmount(value: number): value is TokenTopupAmount {
  return (TOKEN_TOPUP_AMOUNTS as readonly number[]).includes(value);
}

export function getTokenTopupAmountUsd(
  tokenAmount: number,
  applyPremiumDiscount = false,
): number {
  if (!isTokenTopupAmount(tokenAmount)) {
    throw new Error("unsupported tokenAmount");
  }
  const price = TOKEN_PACK_PRICES_USD[tokenAmount];
  if (!applyPremiumDiscount) {
    return price;
  }
  const discounted = price * (1 - PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT / 100);
  return Math.round(discounted * 100) / 100;
}

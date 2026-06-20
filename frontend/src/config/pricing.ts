import {
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
  PREMIUM_USD_MONTHLY,
  PREMIUM_USD_YEARLY,
  TOKEN_PACK_PRICES_USD,
  TOKEN_TOPUP_AMOUNTS,
} from "@vocab-bot/shared/pricing";

export {
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
  PREMIUM_USD_MONTHLY,
  PREMIUM_USD_YEARLY,
};

export type TokenPackRow = { amount: number; priceUsd: number };

export const TOKEN_PACKS: readonly TokenPackRow[] = TOKEN_TOPUP_AMOUNTS.map((amount) => ({
  amount,
  priceUsd: TOKEN_PACK_PRICES_USD[amount],
}));

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatTokenAmount(amount: number): string {
  return amount.toLocaleString("en-US");
}

export function getTokenTopupPriceUsd(
  basePriceUsd: number,
  hasPremiumDiscount: boolean,
): number {
  if (!hasPremiumDiscount) {
    return basePriceUsd;
  }
  const discounted =
    basePriceUsd * (1 - PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT / 100);
  return Math.round(discounted * 100) / 100;
}

export function getPaygPacksForDisplay(hasPremiumDiscount = false): Array<{
  amount: number;
  priceUsd: number;
  tokensLabel: string;
  priceLabel: string;
}> {
  return TOKEN_PACKS.map((row) => ({
    amount: row.amount,
    priceUsd: getTokenTopupPriceUsd(row.priceUsd, hasPremiumDiscount),
    tokensLabel: formatTokenAmount(row.amount),
    priceLabel: formatUsd(getTokenTopupPriceUsd(row.priceUsd, hasPremiumDiscount)),
  }));
}

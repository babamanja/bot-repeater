import { PREMIUM_USD_MONTHLY, PREMIUM_USD_YEARLY } from "@vocab-bot/shared/pricing";

export { PREMIUM_USD_MONTHLY, PREMIUM_USD_YEARLY };

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

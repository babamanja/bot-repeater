export type PaddleEnvironment = "sandbox" | "live";

export type PaddleCheckoutType = "subscription" | "token_topup";

export type SubscriptionBillingPeriod = "monthly" | "yearly";

export {
  TOKEN_TOPUP_AMOUNTS,
  isTokenTopupAmount,
  type TokenTopupAmount,
} from "@vocab-bot/shared/pricing";

import { type TokenTopupAmount, isTokenTopupAmount } from "@vocab-bot/shared/pricing";

type PaddlePriceIds = {
  subscription_1_month: string;
  subscription_1_year: string;
  token_topup_10: string;
  token_topup_25: string;
  token_topup_50: string;
  token_topup_100: string;
  token_topup_250: string;
  token_topup_500: string;
  token_topup_1000: string;
  token_topup_2500: string;
  token_topup_5000: string;
  token_topup_10000: string;
};

/** Paddle Billing API origins per environment. Override with `PADDLE_API_BASE_URL` if needed. */
export const PADDLE_API_BASE_URL_BY_ENV: Record<PaddleEnvironment, string> = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
};

/** Price IDs from the Paddle dashboard (Catalog → Prices). Not secrets — differ per environment. */
export const PADDLE_PRICE_IDS_BY_ENV: Record<PaddleEnvironment, PaddlePriceIds> = {
  sandbox: {
    subscription_1_month: "pri_01kpx8yqfq5j5r8hkdgwmq4acs",
    subscription_1_year: "pri_01krzpzz41rwprn2w588y2zq13",
    token_topup_10: "pri_01kqcpz47y3j8jdrzkv00sxx06",
    token_topup_25: "pri_01krzpz9k57y4b3rrzpm5ak1qj",
    token_topup_50: "",
    token_topup_100: "",
    token_topup_250: "",
    token_topup_500: "",
    token_topup_1000: "",
    token_topup_2500: "",
    token_topup_5000: "",
    token_topup_10000: "",
  },
  live: {
    subscription_1_month: "pri_01kpx86fv6f7k3rrv8y9sq8f5s",
    subscription_1_year: "pri_01krxbmynqzrtm3pyjt9x2wqqf",
    token_topup_10: "pri_01krxbxe824csdv203cby2v6qy",
    token_topup_25: "pri_01krxc0jvpesh9hcg3nwmpcba3",
    token_topup_50: "pri_01krxc2dj57f7z8wc739p4dt7t",
    token_topup_100: "pri_01krxc39vq20nveqvk1tb6g257",
    token_topup_250: "pri_01krxc4371r68nsf8rytm5v00s",
    token_topup_500: "pri_01krxc5k2v84k9aysrsbb3ghc0",
    token_topup_1000: "pri_01krxc6hvvdj50sntp28wpq4gy",
    token_topup_2500: "pri_01krxc7shk55y3xyc97swwtm03",
    token_topup_5000: "pri_01krxc8da9dzxzqpm92n5e4ncb",
    token_topup_10000: "pri_01krxc98ektyetwy4j9n93mx02",
  },
};

function isPaddleEnvironment(value: string): value is PaddleEnvironment {
  return value === "sandbox" || value === "live";
}

export function getPaddleEnvironment(): PaddleEnvironment {
  const raw = process.env.PADDLE_ENV?.trim().toLowerCase();
  if (!raw) {
    return "sandbox";
  }
  if (!isPaddleEnvironment(raw)) {
    throw new Error('PADDLE_ENV must be "sandbox" or "live"');
  }
  return raw;
}

export function getPaddleApiBaseUrl(): string {
  const override = process.env.PADDLE_API_BASE_URL?.trim();
  if (override) {
    return override.replace(/\/+$/, "");
  }
  return PADDLE_API_BASE_URL_BY_ENV[getPaddleEnvironment()];
}

function assertValidPriceId(priceId: string, label: string): string {
  const value = priceId.trim();
  if (!value.startsWith("pri_")) {
    throw new Error(`invalid Paddle price id for ${label}`);
  }
  return value;
}

function subscriptionPriceKey(
  billingPeriod: SubscriptionBillingPeriod,
): keyof PaddlePriceIds {
  return billingPeriod === "yearly"
    ? "subscription_1_year"
    : "subscription_1_month";
}

function tokenTopupPriceKey(amount: TokenTopupAmount): keyof PaddlePriceIds {
  return `token_topup_${amount}` as keyof PaddlePriceIds;
}

export function getPaddlePriceId(input: {
  checkoutType: PaddleCheckoutType;
  planCode: "basic" | "premium";
  billingPeriod?: SubscriptionBillingPeriod;
  tokenAmount?: number;
}): string {
  const prices = PADDLE_PRICE_IDS_BY_ENV[getPaddleEnvironment()];

  if (input.checkoutType === "subscription") {
    if (input.planCode !== "premium") {
      throw new Error("unsupported planCode");
    }
    const billingPeriod = input.billingPeriod ?? "monthly";
    if (billingPeriod !== "monthly" && billingPeriod !== "yearly") {
      throw new Error("invalid billingPeriod");
    }
    const key = subscriptionPriceKey(billingPeriod);
    return assertValidPriceId(
      prices[key],
      billingPeriod === "yearly" ? "yearly subscription" : "monthly subscription",
    );
  }

  const tokenAmount = input.tokenAmount;
  if (tokenAmount == null || !isTokenTopupAmount(tokenAmount)) {
    throw new Error("unsupported tokenAmount");
  }
  const key = tokenTopupPriceKey(tokenAmount);
  return assertValidPriceId(prices[key], `${tokenAmount} token topup`);
}

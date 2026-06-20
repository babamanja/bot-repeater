import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { createRequestId, trackAnalyticsEvent, trackUiCtaClick } from "../../analytics";
import {
  cancelMySubscription,
  createCheckoutSession,
  getMySubscription,
  resumeMySubscription,
  type MySubscription,
} from "../../api/subscription";
import { getMyTokens } from "../../api/tokens";
import Button from "../../components/UI/Button/Button";
import Card from "../../components/UI/Card";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import TokenPackSelect from "../../components/payments/TokenPackSelect";
import "../style.scss";
import {
  formatUsd,
  getTokenTopupPriceUsd,
  PREMIUM_USD_MONTHLY,
  PREMIUM_USD_YEARLY,
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
  TOKEN_PACKS,
} from "../../config/pricing";
import { formatRelativeTime } from "../../utils/convertTime";

export default function MySubscriptionPage() {
  const { t } = useTranslation();
  const [premiumBillingPeriod, setPremiumBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [tokensBalance, setTokensBalance] = useState<number | null>(null);
  const [tokenPackAmount, setTokenPackAmount] = useState(String(TOKEN_PACKS[3].amount));
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuyingTokens, setIsBuyingTokens] = useState(false);
  const [isStartingUpgradeCheckout, setIsStartingUpgradeCheckout] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  useEffect(() => {
    trackAnalyticsEvent("subscription_opened", {});
  }, []);

  useEffect(() => {
    let isCancelled = false;
    Promise.all([getMySubscription(), getMyTokens()])
      .then(([subscriptionData, tokensData]) => {
        if (isCancelled) {
          return;
        }
        setSubscription(subscriptionData);
        setTokensBalance(tokensData.balance);
      })
      .catch((loadError) => {
        if (isCancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : t("subscription.loadFailed"));
      })
      .finally(() => {
        if (isCancelled) {
          return;
        }
        setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [t]);

  async function handleUpgradeSubscription() {
    trackUiCtaClick("app_subscription_upgrade_premium", premiumBillingPeriod);
    const requestId = createRequestId();
    trackAnalyticsEvent("checkout_started", {
      request_id: requestId,
      checkout_type: "subscription",
      plan_code: "premium",
    });
    setError(null);
    setIsStartingUpgradeCheckout(true);
    try {
      const session = await createCheckoutSession("premium", "subscription", {
        billingPeriod: premiumBillingPeriod,
      });
      trackAnalyticsEvent("checkout_redirected", {
        request_id: requestId,
        payment_id: session.paymentId,
        checkout_type: "subscription",
        plan_code: session.planCode,
      });
      window.location.assign(
        `/payment/checkout?paymentId=${encodeURIComponent(session.paymentId)}`,
      );
    } catch (checkoutError) {
      trackAnalyticsEvent("checkout_failed", {
        request_id: requestId,
        reason:
          checkoutError instanceof Error ? checkoutError.message : "checkout_session_failed",
        stage: "create_session",
      });
      setError(checkoutError instanceof Error ? checkoutError.message : t("billing.checkoutFailed"));
      setIsStartingUpgradeCheckout(false);
    }
  }

  async function handleCancelSubscription() {
    setError(null);
    setIsCanceling(true);
    try {
      const updated = await cancelMySubscription();
      setSubscription(updated);
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : t("mySubscription.cancelFailed"),
      );
    } finally {
      setIsCanceling(false);
    }
  }

  async function handleResumeSubscription() {
    setError(null);
    setIsResuming(true);
    try {
      const updated = await resumeMySubscription();
      setSubscription(updated);
    } catch (resumeError) {
      setError(
        resumeError instanceof Error ? resumeError.message : t("mySubscription.resumeFailed"),
      );
    } finally {
      setIsResuming(false);
    }
  }

  async function handleBuyTokens() {
    setTokensError(null);
    const amount = Number(tokenPackAmount);
    if (!TOKEN_PACKS.some((pack) => pack.amount === amount)) {
      setTokensError(t("subscription.tokensInvalidAmount"));
      return;
    }
    trackUiCtaClick("app_subscription_buy_tokens", `amount_${amount}`);
    const requestId = createRequestId();
    trackAnalyticsEvent("checkout_started", {
      request_id: requestId,
      checkout_type: "token_topup",
      plan_code: "premium",
      token_amount: amount,
    });
    setIsBuyingTokens(true);
    try {
      const session = await createCheckoutSession("premium", "token_topup", {
        tokenAmount: amount,
      });
      trackAnalyticsEvent("checkout_redirected", {
        request_id: requestId,
        payment_id: session.paymentId,
        checkout_type: "token_topup",
        plan_code: session.planCode,
        token_amount: amount,
      });
      window.location.assign(
        `/payment/checkout?paymentId=${encodeURIComponent(session.paymentId)}`,
      );
    } catch (checkoutError) {
      trackAnalyticsEvent("checkout_failed", {
        request_id: requestId,
        reason:
          checkoutError instanceof Error ? checkoutError.message : "checkout_session_failed",
        stage: "create_session",
      });
      setTokensError(
        checkoutError instanceof Error ? checkoutError.message : t("subscription.tokensPurchaseFailed"),
      );
      setIsBuyingTokens(false);
    }
  }

  if (isLoading) {
    return <p>{t("subscription.loading")}</p>;
  }

  if (error && !subscription) {
    return <p className="upload-file__error">{error}</p>;
  }

  const effectivePlanCode = subscription?.effectivePlanCode ?? "basic";
  const isPremiumPlan = effectivePlanCode === "premium";
  const selectedPackAmount = Number(tokenPackAmount);
  const selectedPack =
    TOKEN_PACKS.find((pack) => pack.amount === selectedPackAmount) ?? TOKEN_PACKS[0];
  const selectedPackPrice = getTokenTopupPriceUsd(
    selectedPack.priceUsd,
    isPremiumPlan,
  );
  const canCancel =
    subscription?.planCode === "premium" &&
    (subscription.status === "active" || subscription.status === "past_due");
  const canResume = subscription?.cancelAtPeriodEnd === true;
  const periodEndLabel = subscription?.currentPeriodEnd
    ? formatRelativeTime(subscription.currentPeriodEnd)
    : null;

  return (
    <Page width="full" className="subscription-page">
      <PageHeader title={t("mySubscription.title")} />
      {error ? <p className="upload-file__error">{error}</p> : null}
      {subscription?.cancelAtPeriodEnd && periodEndLabel ? (
        <p className="subscription-page__notice" role="status">
          {t("subscription.premiumAccessUntil", { date: periodEndLabel })}
        </p>
      ) : null}

      <section className="subscription-page__plans">
        <Card
          as="article"
          className={`subscription-page__plan-card ${
            !isPremiumPlan ? "subscription-page__plan-card--current" : ""
          }`}
        >
          <h2>{t("mySubscription.plans.basic.title")}</h2>
          <p className="subscription-page__plan-price">{t("mySubscription.plans.basic.price")}</p>
          <ul className="subscription-page__benefits">
            <li>{t("mySubscription.plans.basic.benefits.quizGeneration")}</li>
            <li>{t("mySubscription.plans.basic.benefits.fileUploadLimit")}</li>
            <li>{t("mySubscription.plans.basic.benefits.learningHistory")}</li>
            <li>{t("mySubscription.plans.basic.benefits.communitySupport")}</li>
          </ul>
          <Button style="secondary" disabled>
            {isPremiumPlan
              ? t("mySubscription.switchToBasicDisabled")
              : t("mySubscription.currentPlan")}
          </Button>
        </Card>

        <Card
          as="article"
          className={`subscription-page__plan-card ${
            isPremiumPlan ? "subscription-page__plan-card--current" : ""
          }`}
        >
          <h2>{t("mySubscription.plans.premium.title")}</h2>
          {isPremiumPlan && periodEndLabel ? (
            <p className="subscription-page__plan-meta">
              {subscription?.cancelAtPeriodEnd
                ? t("mySubscription.premiumEndsOn", { date: periodEndLabel })
                : t("mySubscription.nextBillingDateDescription")}
            </p>
          ) : null}
          <div
            className="subscription-page__billing-tabs"
            role="tablist"
            aria-label={t("mySubscription.billingPeriod")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={premiumBillingPeriod === "monthly"}
              className={`subscription-page__billing-tab ${
                premiumBillingPeriod === "monthly" ? "subscription-page__billing-tab--active" : ""
              }`}
              onClick={() => setPremiumBillingPeriod("monthly")}
            >
              {t("mySubscription.monthly")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={premiumBillingPeriod === "yearly"}
              className={`subscription-page__billing-tab ${
                premiumBillingPeriod === "yearly" ? "subscription-page__billing-tab--active" : ""
              }`}
              onClick={() => setPremiumBillingPeriod("yearly")}
            >
              {t("mySubscription.yearly")}
            </button>
          </div>
          <p className="subscription-page__plan-price">
            {premiumBillingPeriod === "monthly"
              ? t("mySubscription.plans.premium.priceMonthly", {
                  price: formatUsd(PREMIUM_USD_MONTHLY),
                })
              : t("mySubscription.plans.premium.priceYearly", {
                  price: formatUsd(PREMIUM_USD_YEARLY),
                })}
          </p>
          <ul className="subscription-page__benefits">
            <li>{t("mySubscription.plans.premium.benefits.priorityGeneration")}</li>
            <li>{t("mySubscription.plans.premium.benefits.monthlyTokens")}</li>
            <li>{t("mySubscription.plans.premium.benefits.tokenTopupDiscount")}</li>
            <li>{t("mySubscription.plans.premium.benefits.fileUploadLimit")}</li>
            <li>{t("mySubscription.plans.premium.benefits.saveDocumentOnly")}</li>
            <li>{t("mySubscription.plans.premium.benefits.advancedCustomization")}</li>
            <li>{t("mySubscription.plans.premium.benefits.prioritySupport")}</li>
          </ul>
          <Button onClick={handleUpgradeSubscription} disabled={isStartingUpgradeCheckout || isPremiumPlan}>
            {isPremiumPlan
              ? t("mySubscription.currentPlan")
              : isStartingUpgradeCheckout
                ? t("billing.redirecting")
                : t("subscription.upgradeSubscription")}
          </Button>
          {canCancel ? (
            <Button style="secondary" onClick={handleCancelSubscription} disabled={isCanceling}>
              {isCanceling ? t("mySubscription.canceling") : t("mySubscription.cancelSubscription")}
            </Button>
          ) : null}
          {canResume ? (
            <Button onClick={handleResumeSubscription} disabled={isResuming}>
              {isResuming ? t("mySubscription.resuming") : t("mySubscription.resumeSubscription")}
            </Button>
          ) : null}
        </Card>
      </section>

      <PageHeader title={t("tokens.title")} titleAs="h2" />
      <section className="subscription-page__token-card">
        <p>{t("tokens.description")}</p>
        <p>
          <strong>{t("subscription.currentTokens")}:</strong> {tokensBalance ?? "-"}
        </p>
        {isPremiumPlan ? (
          <p className="subscription-page__notice" role="status">
            {t("subscription.premiumTokenDiscount", {
              percent: PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
            })}
          </p>
        ) : null}
        <label className="upload-file__label" htmlFor="tokens-to-buy-on-subscription">
          {t("subscription.tokensToBuy")}
        </label>
        <TokenPackSelect
          id="tokens-to-buy-on-subscription"
          value={tokenPackAmount}
          isPremiumPlan={isPremiumPlan}
          onChange={setTokenPackAmount}
        />
        <div
          className={`subscription-page__token-price${
            isPremiumPlan ? " subscription-page__token-price--discounted" : ""
          }`}
          aria-live="polite"
        >
          <span className="subscription-page__token-price-label">
            {t("subscription.tokenPackPriceLabel", {
              amount: selectedPack.amount.toLocaleString("en-US"),
            })}
          </span>
          {isPremiumPlan ? (
            <>
              <span className="subscription-page__token-discount-badge">
                {t("subscription.tokenDiscountBadge", {
                  percent: PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
                })}
              </span>
              <span
                className="subscription-page__token-price-old"
                aria-label={t("subscription.originalPriceLabel")}
              >
                {formatUsd(selectedPack.priceUsd)}
              </span>
              <span className="subscription-page__token-price-new">
                {formatUsd(selectedPackPrice)}
              </span>
            </>
          ) : (
            <span className="subscription-page__token-price-new">
              {formatUsd(selectedPackPrice)}
            </span>
          )}
        </div>
        {tokensError ? <p className="upload-file__error">{tokensError}</p> : null}
        <Button onClick={handleBuyTokens} disabled={isBuyingTokens}>
          {isBuyingTokens ? t("subscription.buyingTokens") : t("subscription.buyTokens")}
        </Button>
      </section>
    </Page>
  );
}

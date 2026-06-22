import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { createRequestId, trackAnalyticsEvent, trackUiCtaClick } from "../../analytics";
import { createCheckoutSession } from "../../api/subscription";
import Button from "../UI/Button/Button";
import { formatUsd, PREMIUM_USD_MONTHLY, PREMIUM_USD_YEARLY } from "../../config/pricing";

type UpgradeSubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function UpgradeSubscriptionModal({
  open,
  onClose,
}: UpgradeSubscriptionModalProps) {
  const { t } = useTranslation();
  const [premiumBillingPeriod, setPremiumBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [error, setError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  async function handleUpgradeSubscription() {
    trackUiCtaClick("app_upgrade_modal_upgrade_premium", premiumBillingPeriod);
    const requestId = createRequestId();
    trackAnalyticsEvent("checkout_started", {
      request_id: requestId,
      checkout_type: "subscription",
      plan_code: "premium",
    });
    setError(null);
    setIsStartingCheckout(true);
    try {
      const session = await createCheckoutSession("premium", {
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
      setError(
        checkoutError instanceof Error ? checkoutError.message : t("billing.checkoutFailed"),
      );
      setIsStartingCheckout(false);
    }
  }

  if (!open) {
    return null;
  }

  const premiumBenefits = [
    "mySubscription.plans.premium.benefits.prioritySupport",
    "mySubscription.plans.premium.benefits.telegramPremium",
    "mySubscription.plans.premium.benefits.earlyAccess",
  ] as const;

  return (
    <div className="upgrade-modal" role="presentation">
      <button
        type="button"
        className="upgrade-modal__backdrop"
        aria-label={t("auth.modalClose")}
        onClick={onClose}
      />
      <div
        className="upgrade-modal__dialog upgrade-modal__dialog--subscription"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-subscription-modal-title"
      >
        <button
          type="button"
          className="upgrade-modal__close"
          onClick={onClose}
          aria-label={t("auth.modalClose")}
        >
          ×
        </button>
        <div className="upgrade-modal__body">
          <h2 id="upgrade-subscription-modal-title" className="upgrade-modal__title">
            {t("upload.upgradeSubscriptionModal.title")}
          </h2>
          <p className="upgrade-modal__description">
            {t("upload.upgradeSubscriptionModal.description")}
          </p>
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
          <p className="upgrade-modal__plan-price">
            {premiumBillingPeriod === "monthly"
              ? t("mySubscription.plans.premium.priceMonthly", {
                  price: formatUsd(PREMIUM_USD_MONTHLY),
                })
              : t("mySubscription.plans.premium.priceYearly", {
                  price: formatUsd(PREMIUM_USD_YEARLY),
                })}
          </p>
          <ul className="upgrade-modal__benefits">
            {premiumBenefits.map((benefitKey) => (
              <li key={benefitKey}>{t(benefitKey)}</li>
            ))}
          </ul>
          {error ? (
            <p className="upload-file__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="upgrade-modal__actions">
            <Button
              onClick={() => void handleUpgradeSubscription()}
              disabled={isStartingCheckout}
            >
              {isStartingCheckout
                ? t("billing.redirecting")
                : t("subscription.upgradeSubscription")}
            </Button>
            <Button type="button" style="secondary" onClick={onClose}>
              {t("upload.upgradeSubscriptionModal.notNow")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

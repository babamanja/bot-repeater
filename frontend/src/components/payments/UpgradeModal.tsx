import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { createRequestId, trackAnalyticsEvent, trackUiCtaClick } from "../../analytics";
import { createCheckoutSession, getMySubscription } from "../../api/subscription";
import { getMyTokens } from "../../api/tokens";
import Button from "../UI/Button/Button";
import {
  formatUsd,
  getTokenTopupPriceUsd,
  PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
  TOKEN_PACKS,
} from "../../config/pricing";
import TokenPackSelect from "./TokenPackSelect";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tokenPackAmount, setTokenPackAmount] = useState(String(TOKEN_PACKS[3].amount));
  const [tokensBalance, setTokensBalance] = useState<number | null>(null);
  const [isPremiumPlan, setIsPremiumPlan] = useState(false);
  const [tokensError, setTokensError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuyingTokens, setIsBuyingTokens] = useState(false);

  const selectedPack =
    TOKEN_PACKS.find((pack) => String(pack.amount) === tokenPackAmount) ?? TOKEN_PACKS[0];
  const selectedPackPrice = useMemo(
    () => getTokenTopupPriceUsd(selectedPack.priceUsd, isPremiumPlan),
    [isPremiumPlan, selectedPack.priceUsd],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let isCancelled = false;
    setIsLoading(true);
    setTokensError(null);

    Promise.all([getMyTokens(), getMySubscription()])
      .then(([tokensData, subscriptionData]) => {
        if (isCancelled) {
          return;
        }
        setTokensBalance(tokensData.balance);
        setIsPremiumPlan(subscriptionData.effectivePlanCode === "premium");
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }
        setTokensBalance(null);
        setIsPremiumPlan(false);
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
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
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

  async function handleBuyTokens() {
    setTokensError(null);
    const amount = Number(tokenPackAmount);
    if (!TOKEN_PACKS.some((pack) => pack.amount === amount)) {
      setTokensError(t("subscription.tokensInvalidAmount"));
      return;
    }
    trackUiCtaClick("app_upgrade_modal_buy_tokens", `amount_${amount}`);
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
        checkoutError instanceof Error
          ? checkoutError.message
          : t("subscription.tokensPurchaseFailed"),
      );
      setIsBuyingTokens(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="upgrade-modal" role="presentation">
      <button
        type="button"
        className="upgrade-modal__backdrop"
        aria-label={t("auth.modalClose")}
        onClick={onClose}
      />
      <div
        className="upgrade-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
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
          <h2 id="upgrade-modal-title" className="upgrade-modal__title">
            {t("upload.upgradeModal.title")}
          </h2>
          <p className="upgrade-modal__description">{t("upload.upgradeModal.description")}</p>
          <p className="upgrade-modal__balance">
            <strong>{t("subscription.currentTokens")}:</strong>{" "}
            {isLoading ? t("app.loading") : (tokensBalance ?? "—")}
          </p>
          {isPremiumPlan ? (
            <p className="upgrade-modal__notice" role="status">
              {t("subscription.premiumTokenDiscount", {
                percent: PREMIUM_TOKEN_TOPUP_DISCOUNT_PERCENT,
              })}
            </p>
          ) : null}
          <label className="upload-file__label" htmlFor="upgrade-modal-token-pack">
            {t("subscription.tokensToBuy")}
          </label>
          <TokenPackSelect
            id="upgrade-modal-token-pack"
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
          {tokensError ? (
            <p className="upload-file__error" role="alert">
              {tokensError}
            </p>
          ) : null}
          <div className="upgrade-modal__actions">
            <Button onClick={() => void handleBuyTokens()} disabled={isBuyingTokens || isLoading}>
              {isBuyingTokens ? t("subscription.buyingTokens") : t("subscription.buyTokens")}
            </Button>
            <Button
              type="button"
              style="secondary"
              onClick={() => {
                onClose();
                navigate("/my-subscription");
              }}
            >
              {t("upload.upgradeModal.viewAllPlans")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

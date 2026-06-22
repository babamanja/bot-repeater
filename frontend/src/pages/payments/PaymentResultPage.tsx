import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import PaymentResultView, { formatPaymentFailureReason } from "./PaymentResultView";
import { trackAnalyticsEvent } from "../../analytics";
import { getMyPaymentStatus, type SubscriptionPayment } from "../../api/subscription";
import Button from "../../components/UI/Button/Button";
import {
  paymentCheckoutPath,
  paymentOutcomeFromStatus,
  paymentResultPath,
  type PaymentResultOutcome,
} from "../../lib/paymentRoutes";
import { extractPaddleTransactionId } from "../../lib/paddleCheckout";

type PaymentResultPageProps = {
  outcome: PaymentResultOutcome;
};

export default function PaymentResultPage({ outcome }: PaymentResultPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get("paymentId")?.trim() ?? "";

  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const analyticsEmittedRef = useRef(false);

  const emitOutcomeAnalytics = useCallback(
    (row: SubscriptionPayment) => {
      if (analyticsEmittedRef.current) {
        return;
      }
      analyticsEmittedRef.current = true;

      if (outcome === "success" && row.status === "succeeded") {
        trackAnalyticsEvent("checkout_completed", {
          payment_id: row.paymentId,
          plan_code: row.planCode,
          provider: row.provider ?? undefined,
        });
        return;
      }

      if (outcome === "failed" && row.status === "failed") {
        trackAnalyticsEvent("checkout_failed", {
          payment_id: row.paymentId,
          reason: row.failureReason ?? "payment_failed",
          stage: "payment",
        });
      }
    },
    [outcome],
  );

  const loadPayment = useCallback(async () => {
    if (!paymentId) {
      setLoadError(t("billing.paymentIdMissing"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const row = await getMyPaymentStatus(paymentId);
      const resolvedOutcome = paymentOutcomeFromStatus(row.status, {
        failureReason: row.failureReason,
      });

      if (resolvedOutcome && resolvedOutcome !== outcome) {
        navigate(paymentResultPath(resolvedOutcome, paymentId), { replace: true });
        return;
      }

      setPayment(row);

      emitOutcomeAnalytics(row);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : t("billing.checkoutLoadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [emitOutcomeAnalytics, navigate, outcome, paymentId, t]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  if (isLoading) {
    return (
      <PaymentResultView
        variant="pending"
        title={t("billing.checkoutLoading")}
        message={t("billing.checkoutLoading")}
        showBackLink={false}
      />
    );
  }

  if (loadError || !payment) {
    return (
      <PaymentResultView
        variant="failed"
        title={t("billing.paymentFailedTitle")}
        message={loadError ?? t("billing.checkoutLoadFailed")}
      />
    );
  }

  if (outcome === "success") {
    return (
      <PaymentResultView
        variant="success"
        title={t("billing.paymentSuccessTitle")}
        message={t("billing.paymentSuccess")}
        amountUsd={payment.amount}
        currency={payment.currency}
        details={[
          {
            label: t("billing.planLabel"),
            value: payment.planCode,
          },
        ]}
      />
    );
  }

  if (outcome === "pending") {
    return (
      <PaymentResultView
        variant="pending"
        title={t("billing.paymentPendingTitle")}
        message={t("billing.paymentPendingTimeout")}
        amountUsd={payment.amount}
        currency={payment.currency}
        details={[
          {
            label: t("billing.planLabel"),
            value: payment.planCode,
          },
        ]}
        actions={
          <Button type="button" onClick={() => void loadPayment()}>
            {t("billing.refreshStatus")}
          </Button>
        }
      />
    );
  }

  if (outcome === "canceled") {
    const paddleTransactionId = extractPaddleTransactionId(payment.checkoutUrl);

    return (
      <PaymentResultView
        variant="canceled"
        title={t("billing.checkoutCanceledTitle")}
        message={t("billing.checkoutCanceled")}
        amountUsd={payment.amount}
        currency={payment.currency}
        details={[
          {
            label: t("billing.planLabel"),
            value: payment.planCode,
          },
        ]}
        actions={
          paddleTransactionId ? (
            <Button onClick={() => navigate(paymentCheckoutPath(payment.paymentId))}>
              {t("billing.tryAgain")}
            </Button>
          ) : undefined
        }
      />
    );
  }

  const failureLabel = formatPaymentFailureReason(payment.failureReason, t);
  const paddleTransactionId = extractPaddleTransactionId(payment.checkoutUrl);

  return (
    <PaymentResultView
      variant="failed"
      title={t("billing.paymentFailedTitle")}
      message={t("billing.paymentFailed")}
      amountUsd={payment.amount}
      currency={payment.currency}
      details={[
        {
          label: t("billing.planLabel"),
          value: payment.planCode,
        },
        ...(failureLabel
          ? [{ label: t("billing.failureReasonLabel"), value: failureLabel }]
          : []),
      ]}
      actions={
        paddleTransactionId ? (
          <Button onClick={() => navigate(paymentCheckoutPath(payment.paymentId))}>
            {t("billing.tryAgain")}
          </Button>
        ) : undefined
      }
    />
  );
}

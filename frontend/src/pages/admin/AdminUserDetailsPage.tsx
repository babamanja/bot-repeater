import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { createRequestId, trackAnalyticsEvent } from "../../analytics";
import {
  adjustAdminUserTokens,
  type AdminUserDetails,
  getAdminUserDetails,
  grantAdminPremiumSubscription,
  refundAdminPayment,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import { formatRelativeTime } from "../../utils/convertTime";

type FieldRow = {
  id: string;
  field: string;
  value: ReactNode;
};

type UserPayment = AdminUserDetails["recentPayments"][number];
type TokenLedgerEntry = AdminUserDetails["recentTokenLedger"][number];
type UserSubscription = NonNullable<AdminUserDetails["subscription"]>;

export default function AdminUserDetailsPage() {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [delta, setDelta] = useState("");
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [premiumEndAt, setPremiumEndAt] = useState("");
  const [isGrantingPremium, setIsGrantingPremium] = useState(false);
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);

  const loadUserDetails = useCallback(async () => {
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) {
      throw new Error(t("admin.userDetailsInvalidId"));
    }
    return getAdminUserDetails(id);
  }, [t, userId]);

  const {
    data: user,
    error,
    isLoading,
    reload,
  } = useAdminPage({
    load: loadUserDetails,
    loadErrorMessage: t("admin.userDetailsLoadFailed"),
  });

  useEffect(() => {
    if (user) {
      trackAnalyticsEvent("admin_user_details_opened", { admin_user_id: user.id });
    }
  }, [user?.id]);

  const premiumEndAtMin = (() => {
    const nextMinute = new Date(Date.now() + 60_000);
    const offsetMinutes = nextMinute.getTimezoneOffset();
    const local = new Date(nextMinute.getTime() - offsetMinutes * 60_000);
    return local.toISOString().slice(0, 16);
  })();

  async function handleAdjustTokens() {
    setActionError(null);
    const id = Number(userId);
    const parsedDelta = Number(delta);
    if (!Number.isInteger(id) || id < 1) {
      setActionError(t("admin.userDetailsInvalidId"));
      return;
    }
    if (!Number.isInteger(parsedDelta) || parsedDelta === 0) {
      setActionError(t("admin.userDetailsDeltaInvalid"));
      return;
    }
    if (!comment.trim()) {
      setActionError(t("admin.userDetailsCommentRequired"));
      return;
    }

    setIsSubmitting(true);
    const requestId = createRequestId();
    try {
      await adjustAdminUserTokens(id, { delta: parsedDelta, comment: comment.trim() });
      trackAnalyticsEvent("admin_tokens_adjusted", {
        request_id: requestId,
        admin_user_id: id,
        token_delta: parsedDelta,
      });
      setDelta("");
      setComment("");
      await reload();
    } catch (adjustError) {
      setActionError(
        adjustError instanceof Error ? adjustError.message : t("admin.userDetailsAdjustFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGrantPremium() {
    setActionError(null);
    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) {
      setActionError(t("admin.userDetailsInvalidId"));
      return;
    }
    if (!premiumEndAt.trim()) {
      setActionError(t("admin.userDetailsPremiumEndInvalid"));
      return;
    }

    const currentPeriodEnd = new Date(premiumEndAt);
    if (Number.isNaN(currentPeriodEnd.getTime()) || currentPeriodEnd <= new Date()) {
      setActionError(t("admin.userDetailsPremiumEndInvalid"));
      return;
    }

    setIsGrantingPremium(true);
    const requestId = createRequestId();
    try {
      await grantAdminPremiumSubscription(id, {
        currentPeriodEnd: currentPeriodEnd.toISOString(),
      });
      trackAnalyticsEvent("admin_premium_granted", {
        request_id: requestId,
        admin_user_id: id,
        premium_until: currentPeriodEnd.toISOString(),
      });
      setPremiumEndAt("");
      await reload();
    } catch (grantError) {
      setActionError(
        grantError instanceof Error ? grantError.message : t("admin.userDetailsGrantPremiumFailed"),
      );
    } finally {
      setIsGrantingPremium(false);
    }
  }

  async function handleRefundPayment(paymentId: string) {
    setActionError(null);
    const reason = window.prompt(t("admin.refundReasonPrompt"));
    if (reason == null) {
      return;
    }
    if (!reason.trim()) {
      setActionError(t("admin.refundReasonRequired"));
      return;
    }

    const id = Number(userId);
    if (!Number.isInteger(id) || id < 1) {
      setActionError(t("admin.userDetailsInvalidId"));
      return;
    }

    setRefundingPaymentId(paymentId);
    const requestId = createRequestId();
    trackAnalyticsEvent("admin_refund_started", {
      request_id: requestId,
      payment_id: paymentId,
    });
    try {
      await refundAdminPayment(paymentId, { reason: reason.trim() });
      trackAnalyticsEvent("admin_refund_succeeded", {
        request_id: requestId,
        payment_id: paymentId,
      });
      await reload();
    } catch (refundError) {
      trackAnalyticsEvent("admin_refund_failed", {
        request_id: requestId,
        payment_id: paymentId,
        reason: refundError instanceof Error ? refundError.message : "refund_failed",
      });
      setActionError(refundError instanceof Error ? refundError.message : t("admin.refundFailed"));
    } finally {
      setRefundingPaymentId(null);
    }
  }

  const fieldColumns = useMemo<DataListColumn<FieldRow>[]>(
    () => [
      {
        id: "adminUserDetails.field",
        label: t("table.adminUserDetails.field"),
        mobileRole: "summary-primary",
        render: (row) => row.field,
      },
      {
        id: "adminUserDetails.value",
        label: t("table.adminUserDetails.value"),
        mobileRole: "summary-secondary",
        render: (row) => row.value,
      },
    ],
    [t],
  );

  const subscriptionColumns = useMemo<DataListColumn<UserSubscription>[]>(
    () => [
      {
        id: "adminUserDetailsSubscription.planCode",
        label: t("table.adminUserDetailsSubscription.planCode"),
        mobileRole: "summary-primary",
        render: (subscription) => subscription.planCode,
      },
      {
        id: "adminUserDetailsSubscription.status",
        label: t("table.adminUserDetailsSubscription.status"),
        mobileRole: "summary-secondary",
        render: (subscription) => subscription.status,
      },
      {
        id: "adminUserDetailsSubscription.id",
        label: t("table.adminUserDetailsSubscription.id"),
        mobileRole: "detail",
        mobileWide: true,
        render: (subscription) => subscription.id,
      },
      {
        id: "adminUserDetailsSubscription.currentPeriodEnd",
        label: t("table.adminUserDetailsSubscription.currentPeriodEnd"),
        mobileRole: "detail",
        render: (subscription) =>
          subscription.currentPeriodEnd
            ? formatRelativeTime(subscription.currentPeriodEnd)
            : "-",
      },
      {
        id: "adminUserDetailsSubscription.createdAt",
        label: t("table.adminUserDetailsSubscription.createdAt"),
        mobileRole: "detail",
        render: (subscription) => formatRelativeTime(subscription.createdAt),
      },
      {
        id: "adminUserDetailsSubscription.paymentId",
        label: t("table.adminUserDetailsSubscription.paymentId"),
        mobileRole: "detail",
        mobileWide: true,
        render: (subscription) => subscription.paymentId ?? "-",
      },
    ],
    [t],
  );

  const paymentColumns = useMemo<DataListColumn<UserPayment>[]>(
    () => [
      {
        id: "adminUserDetailsPayments.amount",
        label: t("table.adminUserDetailsPayments.amount"),
        mobileRole: "summary-primary",
        render: (payment) => `${payment.amount.toFixed(2)} ${payment.currency}`,
      },
      {
        id: "adminUserDetailsPayments.status",
        label: t("table.adminUserDetailsPayments.status"),
        mobileRole: "summary-secondary",
        render: (payment) => payment.status,
      },
      {
        id: "adminUserDetailsPayments.id",
        label: t("table.adminUserDetailsPayments.id"),
        mobileRole: "detail",
        mobileWide: true,
        render: (payment) => payment.id,
      },
      {
        id: "adminUserDetailsPayments.date",
        label: t("table.adminUserDetailsPayments.date"),
        mobileRole: "detail",
        render: (payment) => formatRelativeTime(payment.date),
      },
      {
        id: "adminUserDetailsPayments.type",
        label: t("table.adminUserDetailsPayments.type"),
        mobileRole: "detail",
        render: (payment) => payment.transactionType,
      },
      {
        id: "adminUserDetailsPayments.provider",
        label: t("table.adminUserDetailsPayments.provider"),
        mobileRole: "detail",
        render: (payment) => payment.provider ?? "-",
      },
      {
        id: "adminUserDetailsPayments.actions",
        label: t("table.adminUserDetailsPayments.actions"),
        mobileRole: "footer",
        render: (payment) =>
          payment.transactionType === "payment" && payment.status === "succeeded" ? (
            <Button
              style="secondary"
              disabled={refundingPaymentId === payment.id}
              onClick={() => void handleRefundPayment(payment.id)}
            >
              {refundingPaymentId === payment.id ? t("admin.refunding") : t("admin.refund")}
            </Button>
          ) : null,
      },
    ],
    [refundingPaymentId, t],
  );

  const tokenLedgerColumns = useMemo<DataListColumn<TokenLedgerEntry>[]>(
    () => [
      {
        id: "adminUserDetailsTokens.type",
        label: t("table.adminUserDetailsTokens.type"),
        mobileRole: "summary-primary",
        render: (entry) => entry.transactionType,
      },
      {
        id: "adminUserDetailsTokens.delta",
        label: t("table.adminUserDetailsTokens.delta"),
        mobileRole: "summary-secondary",
        render: (entry) => entry.delta,
      },
      {
        id: "adminUserDetailsTokens.id",
        label: t("table.adminUserDetailsTokens.id"),
        mobileRole: "detail",
        mobileWide: true,
        render: (entry) => entry.id,
      },
      {
        id: "adminUserDetailsTokens.date",
        label: t("table.adminUserDetailsTokens.date"),
        mobileRole: "detail",
        render: (entry) => formatRelativeTime(entry.createdAt),
      },
      {
        id: "adminUserDetailsTokens.balanceAfter",
        label: t("table.adminUserDetailsTokens.balanceAfter"),
        mobileRole: "detail",
        render: (entry) => entry.balanceAfter ?? "-",
      },
      {
        id: "adminUserDetailsTokens.referenceId",
        label: t("table.adminUserDetailsTokens.referenceId"),
        mobileRole: "detail",
        mobileWide: true,
        render: (entry) => entry.referenceId ?? "-",
      },
    ],
    [t],
  );

  if (isLoading) {
    return <p>{t("admin.userDetailsLoading")}</p>;
  }

  if (error) {
    return <p className="upload-file__error">{error}</p>;
  }

  if (!user) {
    return <p className="upload-file__error">{t("admin.userDetailsNotFound")}</p>;
  }

  const providers = `${user.providers.password ? "password" : ""}${
    user.providers.password && user.providers.google ? " + " : ""
  }${user.providers.google ? "google" : ""}`;

  const profileRows: FieldRow[] = [
    { id: "id", field: "ID", value: user.id },
    {
      id: "userName",
      field: t("table.adminUsers.userName"),
      value: user.userName,
    },
    {
      id: "email",
      field: t("table.adminUsers.email"),
      value: user.email,
    },
    {
      id: "role",
      field: t("table.adminUsers.role"),
      value: user.role,
    },
    {
      id: "providers",
      field: t("table.adminUsers.providers"),
      value: providers || "-",
    },
    {
      id: "tokenBalance",
      field: t("admin.userDetailsTokenBalance"),
      value: user.tokenBalance,
    },
    {
      id: "quizCount",
      field: t("table.adminUsers.quizCount"),
      value: user.quizCount,
    },
    {
      id: "attemptCount",
      field: t("table.adminUsers.attemptCount"),
      value: user.attemptCount,
    },
  ];

  return (
    <section>
      <h1>{t("admin.userDetailsTitle", { userId: user.id })}</h1>
      <p>
        <Link to="/admin/users">{t("admin.userDetailsBackToUsers")}</Link>
      </p>

      <h2>{t("admin.userDetailsProfileSection")}</h2>
      <ResponsiveDataList
        columns={fieldColumns}
        data={profileRows}
        getRowKey={(row) => row.id}
      />

      <h2>{t("admin.userDetailsTokenAdjustSection")}</h2>
      <label className="upload-file__label" htmlFor="admin-token-delta">
        {t("admin.userDetailsTokenDeltaLabel")}
      </label>
      <input
        id="admin-token-delta"
        className="upload-file__textarea"
        type="number"
        step={1}
        value={delta}
        onChange={(event) => setDelta(event.target.value)}
      />
      <label className="upload-file__label" htmlFor="admin-token-comment">
        {t("admin.userDetailsTokenCommentLabel")}
      </label>
      <textarea
        id="admin-token-comment"
        className="upload-file__textarea"
        rows={3}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      {actionError ? <p className="upload-file__error">{actionError}</p> : null}
      <Button onClick={() => void handleAdjustTokens()} disabled={isSubmitting}>
        {isSubmitting ? t("admin.userDetailsAdjusting") : t("admin.userDetailsAdjustTokensButton")}
      </Button>

      <h2>{t("admin.userDetailsSubscriptionSection")}</h2>
      <h3>{t("admin.userDetailsGrantPremiumSection")}</h3>
      <label className="upload-file__label" htmlFor="admin-premium-end">
        {t("admin.userDetailsPremiumEndLabel")}
      </label>
      <input
        id="admin-premium-end"
        className="upload-file__textarea"
        type="datetime-local"
        min={premiumEndAtMin}
        value={premiumEndAt}
        onChange={(event) => setPremiumEndAt(event.target.value)}
      />
      <Button onClick={() => void handleGrantPremium()} disabled={isGrantingPremium || isSubmitting}>
        {isGrantingPremium
          ? t("admin.userDetailsGrantingPremium")
          : t("admin.userDetailsGrantPremiumButton")}
      </Button>
      {actionError ? <p className="upload-file__error">{actionError}</p> : null}
      <ResponsiveDataList
        columns={subscriptionColumns}
        data={user.subscription ? [user.subscription] : []}
        getRowKey={(subscription) => subscription.id}
        emptyMessage={t("table.empty")}
      />

      <h2>{t("admin.userDetailsPaymentsSection")}</h2>
      <ResponsiveDataList
        columns={paymentColumns}
        data={user.recentPayments}
        getRowKey={(payment) => payment.id}
      />

      <h2>{t("admin.userDetailsTokenLedgerSection")}</h2>
      <ResponsiveDataList
        columns={tokenLedgerColumns}
        data={user.recentTokenLedger}
        getRowKey={(entry) => entry.id}
      />
    </section>
  );
}

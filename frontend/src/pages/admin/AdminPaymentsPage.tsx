import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { createRequestId, trackAnalyticsEvent } from "../../analytics";
import {
  type AdminPayment,
  getAdminPayments,
  type PaginationMeta,
  refundAdminPayment,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";
import { formatRelativeTime } from "../../utils/convertTime";

type StatusFilter = "" | "pending" | "succeeded" | "failed" | "refunded";
type TransactionTypeFilter = "" | "payment" | "refund";
type SortBy = "date" | "amount" | "status" | "transactionType";

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [refundingPaymentId, setRefundingPaymentId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadPayments = useCallback(
    () =>
      getAdminPayments({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        status: status || undefined,
        transactionType: transactionType || undefined,
        sortBy,
        sortOrder,
      }),
    [
      pagination.page,
      pagination.pageSize,
      search,
      status,
      transactionType,
      sortBy,
      sortOrder,
    ],
  );

  const { data, error, setError, reload } = useAdminPage({
    load: loadPayments,
    loadErrorMessage: t("admin.paymentsLoadFailed"),
    trackOpenEvent: "admin_payments_opened",
  });

  const payments = data?.items ?? [];
  const paginationMeta = data?.pagination ?? pagination;

  async function handleRefund(payment: AdminPayment) {
    setError(null);
    const reason = window.prompt(t("admin.refundReasonPrompt"));
    if (reason == null) {
      return;
    }
    if (!reason.trim()) {
      setError(t("admin.refundReasonRequired"));
      return;
    }

    const requestId = createRequestId();
    trackAnalyticsEvent("admin_refund_started", {
      request_id: requestId,
      payment_id: payment.id,
    });
    setRefundingPaymentId(payment.id);
    try {
      await refundAdminPayment(payment.id, { reason: reason.trim() });
      trackAnalyticsEvent("admin_refund_succeeded", {
        request_id: requestId,
        payment_id: payment.id,
      });
      await reload();
    } catch (refundError) {
      trackAnalyticsEvent("admin_refund_failed", {
        request_id: requestId,
        payment_id: payment.id,
        reason: refundError instanceof Error ? refundError.message : "refund_failed",
      });
      setError(refundError instanceof Error ? refundError.message : t("admin.refundFailed"));
    } finally {
      setRefundingPaymentId(null);
    }
  }

  const columns = useMemo<DataListColumn<AdminPayment>[]>(
    () => [
      {
        id: "adminPayments.amount",
        label: t("table.adminPayments.amount"),
        mobileRole: "summary-primary",
        render: (payment) => `${payment.amount.toFixed(2)} ${payment.currency}`,
      },
      {
        id: "adminPayments.status",
        label: t("table.adminPayments.status"),
        mobileRole: "summary-secondary",
        render: (payment) => payment.status,
      },
      {
        id: "adminPayments.id",
        label: t("table.adminPayments.id"),
        mobileRole: "detail",
        mobileWide: true,
        render: (payment) => payment.id,
      },
      {
        id: "adminPayments.date",
        label: t("table.adminPayments.date"),
        mobileRole: "detail",
        render: (payment) => formatRelativeTime(payment.date),
      },
      {
        id: "adminPayments.userId",
        label: t("table.adminPayments.userId"),
        mobileRole: "detail",
        render: (payment) => payment.userId,
      },
      {
        id: "adminPayments.userName",
        label: t("table.adminPayments.userName"),
        mobileRole: "detail",
        render: (payment) => payment.userName,
      },
      {
        id: "adminPayments.email",
        label: t("table.adminPayments.email"),
        mobileRole: "detail",
        mobileWide: true,
        render: (payment) => payment.email,
      },
      {
        id: "adminPayments.transactionType",
        label: t("table.adminPayments.transactionType"),
        mobileRole: "detail",
        render: (payment) => payment.transactionType,
      },
      {
        id: "adminPayments.provider",
        label: t("table.adminPayments.provider"),
        mobileRole: "detail",
        render: (payment) => payment.provider ?? "-",
      },
      {
        id: "adminPayments.providerTransactionId",
        label: t("table.adminPayments.providerTransactionId"),
        mobileRole: "detail",
        mobileWide: true,
        render: (payment) => payment.providerTransactionId ?? "-",
      },
      {
        id: "adminPayments.actions",
        label: t("table.adminPayments.actions"),
        mobileRole: "footer",
        render: (payment) =>
          payment.transactionType === "payment" && payment.status === "succeeded" ? (
            <Button
              style="secondary"
              disabled={refundingPaymentId === payment.id}
              onClick={() => void handleRefund(payment)}
            >
              {refundingPaymentId === payment.id ? t("admin.refunding") : t("admin.refund")}
            </Button>
          ) : null,
      },
    ],
    [refundingPaymentId, t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.paymentsTitle")} />
      {error && <p className="upload-file__error">{error}</p>}
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 260, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setSearch(event.target.value);
          }}
          placeholder={t("admin.filtersSearch")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={status}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setStatus(event.target.value as StatusFilter);
          }}
        >
          <option value="">{t("admin.filtersStatusAll")}</option>
          <option value="pending">pending</option>
          <option value="succeeded">succeeded</option>
          <option value="failed">failed</option>
          <option value="refunded">refunded</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={transactionType}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setTransactionType(event.target.value as TransactionTypeFilter);
          }}
        >
          <option value="">{t("admin.filtersTypeAll")}</option>
          <option value="payment">payment</option>
          <option value="refund">refund</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 200, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
        >
          <option value="date">date</option>
          <option value="amount">amount</option>
          <option value="status">status</option>
          <option value="transactionType">transactionType</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 140, marginBottom: 0 }}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
        >
          <option value="asc">asc</option>
          <option value="desc">desc</option>
        </select>
      </div>
      <ResponsiveDataList columns={columns} data={payments} getRowKey={(payment) => payment.id} />
      <div
        className="admin-pagination"
        style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}
      >
        <Button
          style="secondary"
          disabled={paginationMeta.page <= 1}
          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
        >
          {t("admin.prevPage")}
        </Button>
        <span>
          {t("admin.page")} {paginationMeta.page} / {paginationMeta.totalPages}
        </span>
        <Button
          style="secondary"
          disabled={paginationMeta.page >= paginationMeta.totalPages}
          onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
        >
          {t("admin.nextPage")}
        </Button>
        <span>
          {t("admin.totalRows")}: {paginationMeta.total}
        </span>
      </div>
    </Page>
  );
}

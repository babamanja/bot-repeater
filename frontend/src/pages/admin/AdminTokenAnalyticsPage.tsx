import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { type AdminAiUsage, getAdminAiUsage } from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import PageSection from "../../components/UI/PageSection";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";
import { formatRelativeTime } from "../../utils/convertTime";

const PERIOD_OPTIONS = [7, 30, 90];

type AiUsageItem = AdminAiUsage["items"][number];

type SortBy = "createdAt" | "aiTotalTokens" | "estimatedTokens" | "sourceTextLength";

export default function AdminTokenAnalyticsPage() {
  const { t } = useTranslation();
  const [periodDays, setPeriodDays] = useState(30);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "success" | "failed">("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadAnalytics = useCallback(
    () =>
      getAdminAiUsage({
        days: periodDays,
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      }),
    [page, pageSize, periodDays, search, sortBy, sortOrder, status],
  );

  const { data: usage, error, isLoading } = useAdminPage({
    load: loadAnalytics,
    loadErrorMessage: t("admin.aiUsageLoadFailed"),
    trackOpenEvent: "admin_ai_usage_opened",
  });

  const columns = useMemo<DataListColumn<AiUsageItem>[]>(
    () => [
      {
        id: "aiUsage.feature",
        label: t("table.aiUsage.feature"),
        mobileRole: "summary-primary",
        render: (row) => row.feature,
      },
      {
        id: "aiUsage.status",
        label: t("table.aiUsage.status"),
        mobileRole: "summary-secondary",
        render: (row) => row.status,
      },
      {
        id: "aiUsage.createdAt",
        label: t("table.aiUsage.createdAt"),
        mobileRole: "detail",
        render: (row) => formatRelativeTime(row.createdAt),
      },
      {
        id: "aiUsage.userId",
        label: t("table.aiUsage.userId"),
        mobileRole: "detail",
        render: (row) => row.userId ?? "-",
      },
      {
        id: "aiUsage.sourceTextLength",
        label: t("table.aiUsage.sourceTextLength"),
        mobileRole: "detail",
        render: (row) => row.sourceTextLength,
      },
      {
        id: "aiUsage.estimatedTokens",
        label: t("table.aiUsage.estimatedTokens"),
        mobileRole: "detail",
        render: (row) => row.estimatedTokens,
      },
      {
        id: "aiUsage.aiInputTokens",
        label: t("table.aiUsage.aiInputTokens"),
        mobileRole: "detail",
        render: (row) => row.aiInputTokens ?? "-",
      },
      {
        id: "aiUsage.aiOutputTokens",
        label: t("table.aiUsage.aiOutputTokens"),
        mobileRole: "detail",
        render: (row) => row.aiOutputTokens ?? "-",
      },
      {
        id: "aiUsage.aiTotalTokens",
        label: t("table.aiUsage.aiTotalTokens"),
        mobileRole: "detail",
        render: (row) => row.aiTotalTokens ?? "-",
      },
      {
        id: "aiUsage.aiModel",
        label: t("table.aiUsage.aiModel"),
        mobileRole: "detail",
        mobileWide: true,
        render: (row) => row.aiModel ?? "-",
      },
      {
        id: "aiUsage.errorMessage",
        label: t("table.aiUsage.errorMessage"),
        mobileRole: "detail",
        mobileWide: true,
        render: (row) => row.errorMessage ?? "-",
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.aiUsageTitle")} subtitle={t("admin.aiUsageDescription")} />
      <div className="page-toolbar">
        <label htmlFor="ai-usage-period">{t("admin.aiUsagePeriod")}</label>
        <select
          id="ai-usage-period"
          className="text-input"
          style={{ maxWidth: 160, marginBottom: 0 }}
          value={periodDays}
          onChange={(event) => setPeriodDays(Number(event.target.value))}
          disabled={isLoading}
        >
          {PERIOD_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days}d
            </option>
          ))}
        </select>
      </div>
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 260, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder={t("admin.filtersSearch")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as typeof status);
          }}
        >
          <option value="">{t("admin.filtersStatusAll")}</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 240, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
        >
          <option value="createdAt">createdAt</option>
          <option value="aiTotalTokens">aiTotalTokens</option>
          <option value="estimatedTokens">estimatedTokens</option>
          <option value="sourceTextLength">sourceTextLength</option>
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
      {error && <p className="upload-file__error">{error}</p>}
      {isLoading ? <p>{t("admin.aiUsageLoading")}</p> : null}
      {!isLoading && usage ? (
        <PageSection title={t("admin.aiUsageRecordsSection")} titleAs="h2" gap="lg">
          <ResponsiveDataList columns={columns} data={usage.items} getRowKey={(row) => row.id} />
          <div
            className="admin-pagination"
            style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}
          >
            <Button
              style="secondary"
              disabled={usage.pagination.page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              {t("admin.prevPage")}
            </Button>
            <span>
              {t("admin.page")} {usage.pagination.page} / {usage.pagination.totalPages}
            </span>
            <Button
              style="secondary"
              disabled={usage.pagination.page >= usage.pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t("admin.nextPage")}
            </Button>
            <span>
              {t("admin.totalRows")}: {usage.pagination.total}
            </span>
            <select
              className="text-input"
              style={{ maxWidth: 120, marginBottom: 0 }}
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </PageSection>
      ) : null}
    </Page>
  );
}

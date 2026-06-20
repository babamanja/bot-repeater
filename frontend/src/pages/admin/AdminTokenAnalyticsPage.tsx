import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type AdminTokenAnalytics,
  getAdminTokenAnalytics,
} from "../../api/admin";
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

type TokenAnalyticsItem = AdminTokenAnalytics["items"][number];

type SortBy =
  | "createdAt"
  | "aiTotalTokens"
  | "estimatedTokens"
  | "sourceTextLength"
  | "generatedQuestionsCount";

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
      getAdminTokenAnalytics({
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

  const { data: analytics, error, isLoading } = useAdminPage({
    load: loadAnalytics,
    loadErrorMessage: t("admin.tokenAnalyticsLoadFailed"),
    trackOpenEvent: "admin_token_analytics_opened",
  });

  const columns = useMemo<DataListColumn<TokenAnalyticsItem>[]>(
    () => [
      {
        id: "tokenAnalyticsGenerations.kind",
        label: t("table.tokenAnalyticsGenerations.kind"),
        mobileRole: "summary-primary",
        render: (row) => t(`table.tokenAnalyticsGenerationType.${row.kind}`),
      },
      {
        id: "tokenAnalyticsGenerations.status",
        label: t("table.tokenAnalyticsGenerations.status"),
        mobileRole: "summary-secondary",
        render: (row) => row.status,
      },
      {
        id: "tokenAnalyticsGenerations.createdAt",
        label: t("table.tokenAnalyticsGenerations.createdAt"),
        mobileRole: "detail",
        render: (row) => formatRelativeTime(row.createdAt),
      },
      {
        id: "tokenAnalyticsGenerations.userId",
        label: t("table.tokenAnalyticsGenerations.userId"),
        mobileRole: "detail",
        render: (row) => row.userId ?? "-",
      },
      {
        id: "tokenAnalyticsGenerations.sourceTextLength",
        label: t("table.tokenAnalyticsGenerations.sourceTextLength"),
        mobileRole: "detail",
        render: (row) => row.sourceTextLength,
      },
      {
        id: "tokenAnalyticsGenerations.generatedQuestionsCount",
        label: t("table.tokenAnalyticsGenerations.generatedQuestionsCount"),
        mobileRole: "detail",
        render: (row) => (row.kind === "chunk_summary" ? "-" : row.generatedQuestionsCount),
      },
      {
        id: "tokenAnalyticsGenerations.estimatedTokens",
        label: t("table.tokenAnalyticsGenerations.estimatedTokens"),
        mobileRole: "detail",
        render: (row) => row.estimatedTokens,
      },
      {
        id: "tokenAnalyticsGenerations.aiInputTokens",
        label: t("table.tokenAnalyticsGenerations.aiInputTokens"),
        mobileRole: "detail",
        render: (row) => row.aiInputTokens ?? "-",
      },
      {
        id: "tokenAnalyticsGenerations.aiOutputTokens",
        label: t("table.tokenAnalyticsGenerations.aiOutputTokens"),
        mobileRole: "detail",
        render: (row) => row.aiOutputTokens ?? "-",
      },
      {
        id: "tokenAnalyticsGenerations.aiTotalTokens",
        label: t("table.tokenAnalyticsGenerations.aiTotalTokens"),
        mobileRole: "detail",
        render: (row) => row.aiTotalTokens ?? "-",
      },
      {
        id: "tokenAnalyticsGenerations.aiModel",
        label: t("table.tokenAnalyticsGenerations.aiModel"),
        mobileRole: "detail",
        mobileWide: true,
        render: (row) => row.aiModel ?? "-",
      },
      {
        id: "tokenAnalyticsGenerations.errorMessage",
        label: t("table.tokenAnalyticsGenerations.errorMessage"),
        mobileRole: "detail",
        mobileWide: true,
        render: (row) => row.errorMessage ?? "-",
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader
        title={t("admin.tokenAnalyticsTitle")}
        subtitle={t("admin.tokenAnalyticsDescription")}
      />
      <div className="page-toolbar">
        <label htmlFor="token-analytics-period">{t("admin.tokenAnalyticsPeriod")}</label>
        <select
          id="token-analytics-period"
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
          <option value="generatedQuestionsCount">generatedQuestionsCount</option>
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
      {isLoading ? <p>{t("admin.tokenAnalyticsLoading")}</p> : null}
      {!isLoading && analytics ? (
        <PageSection title={t("admin.tokenAnalyticsGenerationsSection")} titleAs="h2" gap="lg">
          <ResponsiveDataList
            columns={columns}
            data={analytics.items}
            getRowKey={(row) => row.id}
          />
          <div
            className="admin-pagination"
            style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}
          >
            <Button
              style="secondary"
              disabled={analytics.pagination.page <= 1}
              onClick={() => setPage((prev) => prev - 1)}
            >
              {t("admin.prevPage")}
            </Button>
            <span>
              {t("admin.page")} {analytics.pagination.page} / {analytics.pagination.totalPages}
            </span>
            <Button
              style="secondary"
              disabled={analytics.pagination.page >= analytics.pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
            >
              {t("admin.nextPage")}
            </Button>
            <span>
              {t("admin.totalRows")}: {analytics.pagination.total}
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

import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  type AdminQuiz,
  getAdminQuizzes,
  type PaginationMeta,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";
import type { QuizStatus } from "../../types";
import { formatRelativeTime } from "../../utils/convertTime";
import { truncateTextWithTitle } from "../../utils/truncateText";

type QuizStatusFilter = "" | QuizStatus;

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

export default function AdminQuizzesPage() {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuizStatusFilter>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadQuizzes = useCallback(
    () =>
      getAdminQuizzes({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
      }),
    [pagination.page, pagination.pageSize, search, status, sortBy, sortOrder],
  );

  const { data, error, isLoading } = useAdminPage({
    load: loadQuizzes,
    loadErrorMessage: t("admin.quizzesLoadFailed"),
    trackOpenEvent: "admin_quizzes_opened",
  });

  const quizzes = data?.items ?? [];
  const paginationMeta = data?.pagination ?? pagination;

  const columns = useMemo<DataListColumn<AdminQuiz>[]>(
    () => [
      {
        id: "adminQuizzes.title",
        label: t("table.adminQuizzes.title"),
        mobileRole: "summary-primary",
        cellClassName: "data-table__cell--truncate",
        render: (quiz) => {
          const { display, title } = truncateTextWithTitle(quiz.title.trim() || "—");
          return <span title={title}>{display}</span>;
        },
      },
      {
        id: "adminQuizzes.status",
        label: t("table.adminQuizzes.status"),
        mobileRole: "summary-secondary",
        render: (quiz) => quiz.status,
      },
      {
        id: "adminQuizzes.id",
        label: t("table.adminQuizzes.id"),
        mobileRole: "detail",
        mobileWide: true,
        render: (quiz) => quiz.id,
      },
      {
        id: "adminQuizzes.createdAt",
        label: t("table.adminQuizzes.createdAt"),
        mobileRole: "detail",
        render: (quiz) => formatRelativeTime(quiz.createdAt),
      },
      {
        id: "adminQuizzes.createdBy",
        label: t("table.adminQuizzes.createdBy"),
        mobileRole: "detail",
        render: (quiz) =>
          quiz.createdBy != null ? (
            <Link to={`/admin/users/${quiz.createdBy}`}>{quiz.createdBy}</Link>
          ) : (
            "—"
          ),
      },
      {
        id: "adminQuizzes.userName",
        label: t("table.adminQuizzes.userName"),
        mobileRole: "detail",
        render: (quiz) => quiz.userName ?? "—",
      },
      {
        id: "adminQuizzes.email",
        label: t("table.adminQuizzes.email"),
        mobileRole: "detail",
        mobileWide: true,
        render: (quiz) => quiz.email ?? "—",
      },
      {
        id: "adminQuizzes.generationQuestionCount",
        label: t("table.adminQuizzes.generationQuestionCount"),
        mobileRole: "detail",
        render: (quiz) => quiz.generationQuestionCount ?? "—",
      },
      {
        id: "adminQuizzes.generationTokensCharged",
        label: t("table.adminQuizzes.generationTokensCharged"),
        mobileRole: "detail",
        render: (quiz) => quiz.generationTokensCharged ?? "—",
      },
      {
        id: "adminQuizzes.tokensRefundedAt",
        label: t("table.adminQuizzes.tokensRefundedAt"),
        mobileRole: "detail",
        render: (quiz) =>
          quiz.tokensRefundedAt ? formatRelativeTime(quiz.tokensRefundedAt) : "—",
      },
      {
        id: "adminQuizzes.documentId",
        label: t("table.adminQuizzes.documentId"),
        mobileRole: "detail",
        mobileWide: true,
        render: (quiz) => quiz.documentId ?? "—",
      },
      {
        id: "adminQuizzes.chunkIndex",
        label: t("table.adminQuizzes.chunkIndex"),
        mobileRole: "detail",
        render: (quiz) => (quiz.chunkIndex != null ? quiz.chunkIndex + 1 : "—"),
      },
      {
        id: "adminQuizzes.errorMessage",
        label: t("table.adminQuizzes.errorMessage"),
        mobileRole: "detail",
        mobileWide: true,
        render: (quiz) => quiz.errorMessage ?? "—",
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.quizzesTitle")} subtitle={t("admin.quizzesDescription")} />
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 280, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setSearch(event.target.value);
          }}
          placeholder={t("admin.quizzesSearchPlaceholder")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={status}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setStatus(event.target.value as QuizStatusFilter);
          }}
        >
          <option value="">{t("admin.filtersStatusAll")}</option>
          <option value="generating">generating</option>
          <option value="published">published</option>
          <option value="ready_to_edit">ready_to_edit</option>
          <option value="failed">failed</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="createdAt">createdAt</option>
          <option value="status">status</option>
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
      {error ? <p className="upload-file__error">{error}</p> : null}
      {isLoading ? <p>{t("admin.quizzesLoading")}</p> : null}
      {!isLoading ? (
        <>
          <ResponsiveDataList columns={columns} data={quizzes} getRowKey={(quiz) => quiz.id} />
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
            <select
              className="text-input"
              style={{ maxWidth: 120, marginBottom: 0 }}
              value={pagination.pageSize}
              onChange={(event) => {
                setPagination({
                  page: 1,
                  pageSize: Number(event.target.value),
                  total: paginationMeta.total,
                  totalPages: paginationMeta.totalPages,
                });
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </>
      ) : null}
    </Page>
  );
}

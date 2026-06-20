import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  type AdminFeedbackItem,
  getAdminFeedback,
  type PaginationMeta,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import { formatRelativeTime } from "../../utils/convertTime";

import "../style.scss";

type CategoryFilter = "" | "bug" | "feature" | "question" | "other";

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

export default function AdminFeedbackPage() {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("");

  const loadFeedback = useCallback(
    () =>
      getAdminFeedback({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        category: category || undefined,
      }),
    [category, pagination.page, pagination.pageSize, search],
  );

  const { data, error, isLoading } = useAdminPage({
    load: loadFeedback,
    loadErrorMessage: t("admin.feedbackLoadFailed"),
    trackOpenEvent: "admin_feedback_opened",
  });

  const items = data?.items ?? [];
  const paginationMeta = data?.pagination ?? pagination;

  const columns = useMemo<DataListColumn<AdminFeedbackItem>[]>(
    () => [
      {
        id: "userNameSummary",
        label: t("admin.feedbackUser"),
        mobileRole: "summary-primary",
        desktopHidden: true,
        render: (item) => item.userName,
      },
      {
        id: "userName",
        label: t("admin.feedbackUser"),
        hideOnMobile: true,
        render: (item) => <Link to={`/admin/users/${item.userId}`}>{item.userName}</Link>,
      },
      {
        id: "category",
        label: t("admin.feedbackCategory"),
        mobileRole: "summary-secondary",
        render: (item) => t(`feedbackPage.categories.${item.category}`),
      },
      {
        id: "email",
        label: t("admin.feedbackEmail"),
        mobileRole: "detail",
        mobileWide: true,
        render: (item) => item.email,
      },
      {
        id: "createdAt",
        label: t("admin.feedbackCreatedAt"),
        mobileRole: "detail",
        render: (item) => formatRelativeTime(item.createdAt),
      },
      {
        id: "message",
        label: t("admin.feedbackMessage"),
        mobileRole: "detail",
        mobileWide: true,
        render: (item) => (
          <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{item.message}</span>
        ),
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.feedbackTitle")} subtitle={t("admin.feedbackDescription")} />
      {error ? <p className="upload-file__error upload-file__error--alert">{error}</p> : null}
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 280, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setSearch(event.target.value);
          }}
          placeholder={t("admin.feedbackSearchPlaceholder")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 200, marginBottom: 0 }}
          value={category}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setCategory(event.target.value as CategoryFilter);
          }}
        >
          <option value="">{t("admin.feedbackCategoryAll")}</option>
          <option value="bug">{t("feedbackPage.categories.bug")}</option>
          <option value="feature">{t("feedbackPage.categories.feature")}</option>
          <option value="question">{t("feedbackPage.categories.question")}</option>
          <option value="other">{t("feedbackPage.categories.other")}</option>
        </select>
      </div>
      {isLoading ? (
        <p>{t("admin.feedbackLoading")}</p>
      ) : (
        <>
          <ResponsiveDataList
            columns={columns}
            data={items}
            getRowKey={(item) => String(item.id)}
          />
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
        </>
      )}
    </Page>
  );
}

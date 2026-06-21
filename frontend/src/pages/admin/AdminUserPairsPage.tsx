import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import {
  type AdminUserPair,
  getAdminUserPairs,
  type PaginationMeta,
} from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

export default function AdminUserPairsPage() {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"nextReviewMs" | "pimsleurLevel">("nextReviewMs");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadUserPairs = useCallback(
    () =>
      getAdminUserPairs({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
      }),
    [pagination.page, pagination.pageSize, search, sortBy, sortOrder],
  );

  const { data, error, isLoading } = useAdminPage({
    load: loadUserPairs,
    loadErrorMessage: t("admin.userPairsLoadFailed"),
    trackOpenEvent: "admin_user_pairs_opened",
  });

  const userPairs = data?.items ?? [];
  const paginationMeta = data?.pagination ?? pagination;

  const columns = useMemo<DataListColumn<AdminUserPair>[]>(
    () => [
      {
        id: "adminUserPairs.userName",
        label: t("table.adminUserPairs.userName"),
        mobileRole: "summary-primary",
        render: (row) => row.userName ?? "—",
      },
      {
        id: "adminUserPairs.vocabPairId",
        label: t("table.adminUserPairs.vocabPairId"),
        mobileRole: "summary-secondary",
        render: (row) => row.vocabPairId,
      },
      {
        id: "adminUserPairs.userId",
        label: t("table.adminUserPairs.userId"),
        mobileRole: "detail",
        render: (row) => <Link to={`/admin/users/${row.userId}`}>{row.userId}</Link>,
      },
      {
        id: "adminUserPairs.email",
        label: t("table.adminUserPairs.email"),
        mobileRole: "detail",
        mobileWide: true,
        render: (row) => row.email ?? "—",
      },
      {
        id: "adminUserPairs.pimsleurLevel",
        label: t("table.adminUserPairs.pimsleurLevel"),
        mobileRole: "detail",
        render: (row) => row.pimsleurLevel,
      },
      {
        id: "adminUserPairs.nextReviewMs",
        label: t("table.adminUserPairs.nextReviewMs"),
        mobileRole: "detail",
        render: (row) => row.nextReviewMs,
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.userPairsTitle")} subtitle={t("admin.userPairsDescription")} />
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 280, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setSearch(event.target.value);
          }}
          placeholder={t("admin.userPairsSearchPlaceholder")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="nextReviewMs">nextReviewMs</option>
          <option value="pimsleurLevel">pimsleurLevel</option>
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
      {isLoading ? <p>{t("admin.userPairsLoading")}</p> : null}
      {!isLoading ? (
        <>
          <ResponsiveDataList
            columns={columns}
            data={userPairs}
            getRowKey={(row) => row.id}
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

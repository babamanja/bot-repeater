import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { type AdminUser, getAdminUsers, type PaginationMeta } from "../../api/admin";
import Button from "../../components/UI/Button/Button";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { useAdminPage } from "../../hooks/useAdminPage";
import "../style.scss";

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"" | "user" | "admin">("");
  const [sortBy, setSortBy] = useState<"id" | "userName" | "email" | "role">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const loadUsers = useCallback(
    () =>
      getAdminUsers({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        role: role || undefined,
        sortBy,
        sortOrder,
      }),
    [pagination.page, pagination.pageSize, role, search, sortBy, sortOrder],
  );

  const { data, error } = useAdminPage({
    load: loadUsers,
    loadErrorMessage: "Failed to load users",
    trackOpenEvent: "admin_users_opened",
  });

  const users = data?.items ?? [];
  const paginationMeta = data?.pagination ?? pagination;

  const columns = useMemo<DataListColumn<AdminUser>[]>(
    () => [
      {
        id: "adminUsers.userName",
        label: t("table.adminUsers.userName"),
        mobileRole: "summary-primary",
        render: (user) => user.userName,
      },
      {
        id: "adminUsers.role",
        label: t("table.adminUsers.role"),
        mobileRole: "summary-secondary",
        render: (user) => user.role,
      },
      {
        id: "adminUsers.id",
        label: t("table.adminUsers.id"),
        mobileRole: "detail",
        render: (user) => <Link to={`/admin/users/${user.id}`}>{user.id}</Link>,
      },
      {
        id: "adminUsers.email",
        label: t("table.adminUsers.email"),
        mobileRole: "detail",
        mobileWide: true,
        render: (user) => user.email,
      },
      {
        id: "adminUsers.providers",
        label: t("table.adminUsers.providers"),
        mobileRole: "detail",
        mobileWide: true,
        render: (user) => {
          const parts = [
            user.providers.password ? "password" : "",
            user.providers.google ? "google" : "",
            user.providers.telegram ? "telegram" : "",
          ].filter(Boolean);
          return parts.length > 0 ? parts.join(" + ") : "—";
        },
      },
      {
        id: "adminUsers.vocabPairCount",
        label: t("table.adminUsers.vocabPairCount"),
        mobileRole: "detail",
        render: (user) => user.vocabPairCount,
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader title={t("admin.usersTitle")} />
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
          value={role}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setRole(event.target.value as "" | "user" | "admin");
          }}
        >
          <option value="">{t("admin.filtersRoleAll")}</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 200, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="id">id</option>
          <option value="userName">userName</option>
          <option value="email">email</option>
          <option value="role">role</option>
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
      <ResponsiveDataList columns={columns} data={users} getRowKey={(user) => String(user.id)} />
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

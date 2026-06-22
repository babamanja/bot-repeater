import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../analytics";
import { type PaginationMeta, type UserWord, getMyWords } from "../api/words";
import Button from "../components/UI/Button/Button";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import ResponsiveDataList from "../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../components/UI/dataListTypes";
import { formatRelativeTime } from "../utils/convertTime";
import AddWordModal from "./words/AddWordModal";

import "./style.scss";

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
};

export default function WordsPage() {
  const { t } = useTranslation();
  const [words, setWords] = useState<UserWord[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"nextReviewMs" | "pimsleurLevel" | "primaryWord">(
    "nextReviewMs",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getMyWords({
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      setWords(result.items);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("wordsPage.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, sortBy, sortOrder, t, reloadNonce]);

  useEffect(() => {
    trackAnalyticsEvent("words_page_opened", {});
  }, []);

  useEffect(() => {
    void loadWords();
  }, [loadWords]);

  const columns = useMemo<DataListColumn<UserWord>[]>(
    () => [
      {
        id: "words.primaryWord",
        label: t("table.words.primaryWord"),
        mobileRole: "summary-primary",
        render: (row) => row.primaryWord,
      },
      {
        id: "words.learningWord",
        label: t("table.words.learningWord"),
        mobileRole: "summary-secondary",
        render: (row) => row.learningWord,
      },
      {
        id: "words.dictionary",
        label: t("table.words.dictionary"),
        mobileRole: "detail",
        render: (row) => row.dictionaryName,
      },
      {
        id: "words.pimsleurLevel",
        label: t("table.words.pimsleurLevel"),
        mobileRole: "detail",
        render: (row) => row.pimsleurLevel,
      },
      {
        id: "words.nextReviewMs",
        label: t("table.words.nextReviewMs"),
        mobileRole: "detail",
        render: (row) => formatRelativeTime(Number(row.nextReviewMs)),
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader
        title={t("wordsPage.title")}
        subtitle={t("wordsPage.description")}
        actions={
          <Button type="button" onClick={() => setAddWordOpen(true)}>
            {t("wordsPage.add.open")}
          </Button>
        }
      />
      <div className="page-toolbar">
        <input
          className="text-input"
          style={{ maxWidth: 280, marginBottom: 0 }}
          value={search}
          onChange={(event) => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setSearch(event.target.value);
          }}
          placeholder={t("wordsPage.searchPlaceholder")}
        />
        <select
          className="text-input"
          style={{ maxWidth: 180, marginBottom: 0 }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
        >
          <option value="nextReviewMs">{t("table.words.nextReviewMs")}</option>
          <option value="pimsleurLevel">{t("table.words.pimsleurLevel")}</option>
          <option value="primaryWord">{t("table.words.primaryWord")}</option>
        </select>
        <select
          className="text-input"
          style={{ maxWidth: 140, marginBottom: 0 }}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")}
        >
          <option value="asc">{t("wordsPage.sortAsc")}</option>
          <option value="desc">{t("wordsPage.sortDesc")}</option>
        </select>
      </div>
      {error ? <p className="upload-file__error">{error}</p> : null}
      {isLoading ? <p>{t("wordsPage.loading")}</p> : null}
      {!isLoading ? (
        <>
          <ResponsiveDataList
            columns={columns}
            data={words}
            getRowKey={(row) => `${row.dictionaryId}:${row.vocabPairId}`}
            emptyMessage={t("wordsPage.empty")}
          />
          <div
            className="admin-pagination"
            style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}
          >
            <Button
              style="secondary"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              {t("admin.prevPage")}
            </Button>
            <span>
              {t("admin.page")} {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              style="secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              {t("admin.nextPage")}
            </Button>
            <span>
              {t("admin.totalRows")}: {pagination.total}
            </span>
          </div>
        </>
      ) : null}
      <AddWordModal
        open={addWordOpen}
        onClose={() => setAddWordOpen(false)}
        onAdded={() => {
          setPagination((prev) => ({ ...prev, page: 1 }));
          setReloadNonce((value) => value + 1);
        }}
      />
    </Page>
  );
}

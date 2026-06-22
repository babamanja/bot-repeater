import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { trackAnalyticsEvent } from "../analytics";
import { type UserDictionary, getMyDictionaries } from "../api/dictionaries";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import ResponsiveDataList from "../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../components/UI/dataListTypes";
import { WORDS_PATH } from "../paths";

import "./style.scss";

export default function MyDictionariesPage() {
  const { t } = useTranslation();
  const [dictionaries, setDictionaries] = useState<UserDictionary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDictionaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getMyDictionaries();
      setDictionaries(items);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("dictionariesPage.loadFailed"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    trackAnalyticsEvent("dictionaries_page_opened", {});
  }, []);

  useEffect(() => {
    void loadDictionaries();
  }, [loadDictionaries]);

  const columns = useMemo<DataListColumn<UserDictionary>[]>(
    () => [
      {
        id: "dictionaries.name",
        label: t("table.dictionaries.name"),
        mobileRole: "summary-primary",
        render: (row) => (
          <span>
            {row.name}
            {row.isDefault ? (
              <span className="status-badge status-badge--success" style={{ marginLeft: 8 }}>
                {t("dictionariesPage.defaultBadge")}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        id: "dictionaries.creator",
        label: t("table.dictionaries.creator"),
        mobileRole: "summary-secondary",
        render: (row) =>
          row.isOwner ? t("dictionariesPage.creatorYou") : row.creatorName,
      },
      {
        id: "dictionaries.entryCount",
        label: t("table.dictionaries.entryCount"),
        mobileRole: "detail",
        render: (row) => row.entryCount,
      },
      {
        id: "dictionaries.actions",
        label: t("table.dictionaries.actions"),
        mobileRole: "detail",
        render: (row) =>
          row.isDefault ? (
            <Link to={WORDS_PATH}>{t("dictionariesPage.viewWords")}</Link>
          ) : (
            "—"
          ),
      },
    ],
    [t],
  );

  return (
    <Page width="full">
      <PageHeader
        title={t("dictionariesPage.title")}
        subtitle={t("dictionariesPage.description")}
      />
      {error ? <p className="upload-file__error">{error}</p> : null}
      {isLoading ? <p>{t("dictionariesPage.loading")}</p> : null}
      {!isLoading ? (
        <ResponsiveDataList
          columns={columns}
          data={dictionaries}
          getRowKey={(row) => String(row.id)}
          emptyMessage={t("dictionariesPage.empty")}
        />
      ) : null}
    </Page>
  );
}

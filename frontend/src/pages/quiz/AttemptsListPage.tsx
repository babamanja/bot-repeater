import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../../analytics";
import type { AttemptListItem } from "../../api/_types";
import { getAttemptList } from "../../api/attempt";
import ButtonLink from "../../components/UI/Button/ButtonLink";
import ResponsiveDataList from "../../components/UI/ResponsiveDataList";
import type { DataListColumn } from "../../components/UI/dataListTypes";
import { formatRelativeTime } from "../../utils/convertTime";
import { truncateTextWithTitle } from "../../utils/truncateText";

const SEARCH_DEBOUNCE_MS = 1000;

type AttemptSort = "newest" | "oldest" | "score_desc" | "score_asc";

function toggleDateSort(current: AttemptSort): AttemptSort {
  return current === "newest" ? "oldest" : "newest";
}

function toggleScoreSort(current: AttemptSort): AttemptSort {
  return current === "score_desc" ? "score_asc" : "score_desc";
}

export default function AttemptsListPage() {
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<AttemptSort>("newest");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackAnalyticsEvent("attempts_list_opened", {});
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let isCancelled = false;
    getAttemptList({
      search: debouncedSearch.trim(),
      sort,
    })
      .then((data) => {
        if (!isCancelled) {
          setAttempts(data);
          setError(null);
        }
      })
      .catch((requestError) => {
        if (!isCancelled) {
          setError(
            requestError instanceof Error ? requestError.message : t("attempts.loadFailed"),
          );
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, sort, t]);

  const dateSortActive = sort === "newest" || sort === "oldest";
  const scoreSortActive = sort === "score_desc" || sort === "score_asc";

  const columns = useMemo<DataListColumn<AttemptListItem>[]>(
    () => [
      {
        id: "attemptsTable.title",
        label: t("table.attemptsTable.title"),
        mobileRole: "summary-primary",
        cellClassName: "data-table__cell--truncate",
        render: (attempt) => {
          const { display, title } = truncateTextWithTitle(attempt.quizTitle);
          return <span title={title}>{display}</span>;
        },
      },
      {
        id: "attemptsTable.score",
        label: t("table.attemptsTable.score"),
        mobileRole: "summary-secondary",
        header: (
          <button
            type="button"
            className="table__sort-button"
            onClick={() => setSort((current) => toggleScoreSort(current))}
          >
            {t("table.attemptsTable.score")}
            {scoreSortActive ? (
              <span className="table__sort-indicator" aria-hidden>
                {sort === "score_desc" ? "↓" : "↑"}
              </span>
            ) : null}
          </button>
        ),
        render: (attempt) => `${attempt.correctCount}/${attempt.questionCount}`,
      },
      {
        id: "attemptsTable.acceptedAt",
        label: t("table.attemptsTable.acceptedAt"),
        mobileRole: "detail",
        header: (
          <button
            type="button"
            className="table__sort-button"
            onClick={() => setSort((current) => toggleDateSort(current))}
          >
            {t("table.attemptsTable.acceptedAt")}
            {dateSortActive ? (
              <span className="table__sort-indicator" aria-hidden>
                {sort === "newest" ? "↓" : "↑"}
              </span>
            ) : null}
          </button>
        ),
        render: (attempt) => formatRelativeTime(attempt.acceptedAt),
      },
      {
        id: "attemptsTable.show",
        label: t("attempts.showResults"),
        mobileRole: "footer",
        header: "",
        render: (attempt) => (
          <ButtonLink to={`/attempts/${attempt.attemptId}`} style="primary">
            {t("attempts.showResults")}
          </ButtonLink>
        ),
      },
    ],
    [dateSortActive, scoreSortActive, sort, t],
  );

  return (
    <section>
      <h1>{t("attempts.title")}</h1>
      <section className="upload-file__form">
        <label className="upload-file__label" htmlFor="attempts-search">
          {t("attempts.searchLabel")}
        </label>
        <input
          id="attempts-search"
          className="upload-file__input"
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("attempts.searchPlaceholder")}
        />
      </section>
      {error ? <p className="upload-file__error">{error}</p> : null}
      <ResponsiveDataList
        columns={columns}
        data={attempts}
        getRowKey={(attempt) => attempt.attemptId}
      />
    </section>
  );
}

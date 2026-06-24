import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../analytics";
import { getVocabLanguages, type VocabLanguages } from "../api/words";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import ReviewSession from "./words/ReviewSession";

import "./style.scss";

export default function UserDashboardPage() {
  const { t } = useTranslation();
  const [languages, setLanguages] = useState<VocabLanguages | null>(null);
  const [languagesLoading, setLanguagesLoading] = useState(true);

  useEffect(() => {
    trackAnalyticsEvent("user_dashboard_opened", {});
    let cancelled = false;
    setLanguagesLoading(true);
    void getVocabLanguages()
      .then((result) => {
        if (!cancelled) {
          setLanguages(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLanguages(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLanguagesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const languagesLabel =
    languages?.primaryName && languages?.learningName
      ? t("dashboard.user.languagesValue", {
          primary: languages.primaryName,
          learning: languages.learningName,
        })
      : null;

  return (
    <Page>
      <PageHeader title={t("dashboard.user.heading")} />
      {languagesLabel ? (
        <p className="dashboard-user__languages">{languagesLabel}</p>
      ) : !languagesLoading ? (
        <p className="dashboard-user__languages dashboard-user__languages--muted">
          {t("dashboard.user.languagesNotSet")}
        </p>
      ) : null}
      <ReviewSession embedded trackOpen={false} />
    </Page>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { trackAnalyticsEvent } from "../analytics";
import { getMySubscription, type MySubscription } from "../api/subscription";
import { getDashboardStats } from "../api/user";
import ButtonLink from "../components/UI/Button/ButtonLink";
import Card from "../components/UI/Card";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import PageSection from "../components/UI/PageSection";
import {
  DICTIONARIES_PATH,
  FEEDBACK_PATH,
  WORDS_PATH,
} from "../paths";
import type { UserDashboardStats } from "../types";
import { getStoredUser } from "../userStorage";

import "./style.scss";

type DashboardLink = {
  to: string;
  titleKey: string;
  descKey: string;
};

const LINKS: DashboardLink[] = [
  { to: WORDS_PATH, titleKey: "dashboard.user.links.words.title", descKey: "dashboard.user.links.words.desc" },
  {
    to: DICTIONARIES_PATH,
    titleKey: "dashboard.user.links.dictionaries.title",
    descKey: "dashboard.user.links.dictionaries.desc",
  },
  {
    to: "/my-subscription",
    titleKey: "dashboard.user.links.subscription.title",
    descKey: "dashboard.user.links.subscription.desc",
  },
  { to: "/billing-history", titleKey: "dashboard.user.links.billing.title", descKey: "dashboard.user.links.billing.desc" },
  { to: "/profile", titleKey: "dashboard.user.links.profile.title", descKey: "dashboard.user.links.profile.desc" },
  { to: FEEDBACK_PATH, titleKey: "dashboard.user.links.feedback.title", descKey: "dashboard.user.links.feedback.desc" },
];

function formatPlanLabel(planCode: MySubscription["effectivePlanCode"], t: (key: string) => string): string {
  return planCode === "premium" ? t("dashboard.user.planPremium") : t("dashboard.user.planBasic");
}

function formatSubscriptionStatus(
  status: MySubscription["status"],
  t: (key: string) => string,
): string {
  switch (status) {
    case "active":
      return t("dashboard.user.subscriptionStatusActive");
    case "canceled":
      return t("dashboard.user.subscriptionStatusCanceled");
    case "past_due":
      return t("dashboard.user.subscriptionStatusPastDue");
    default:
      return status;
  }
}

export default function UserDashboardPage() {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    trackAnalyticsEvent("user_dashboard_opened", {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.allSettled([getDashboardStats(), getMySubscription()])
      .then(([statsResult, subscriptionResult]) => {
        if (cancelled) {
          return;
        }
        if (statsResult.status === "fulfilled") {
          setStats(statsResult.value);
          setStatsError(null);
        } else {
          setStats(null);
          setStatsError(
            statsResult.reason instanceof Error
              ? statsResult.reason.message
              : t("dashboard.user.statsLoadFailed"),
          );
        }
        if (subscriptionResult.status === "fulfilled") {
          setSubscription(subscriptionResult.value);
        } else {
          setSubscription(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const languagesLabel =
    stats?.primaryLanguage && stats?.learningLanguage
      ? t("dashboard.user.languagesValue", {
          primary: stats.primaryLanguage,
          learning: stats.learningLanguage,
        })
      : null;

  return (
    <Page>
      <PageHeader
        title={t("dashboard.user.heading")}
      />
      {languagesLabel ? (
          <p className="dashboard-user__languages">{languagesLabel}</p>
        ) : !isLoading ? (
          <p className="dashboard-user__languages dashboard-user__languages--muted">
            {t("dashboard.user.languagesNotSet")}
          </p>
        ) : null}

      {statsError ? (
        <p className="upload-file__error" role="alert">
          {statsError}
        </p>
      ) : null}

      <PageSection title={t("dashboard.user.statsTitle")} titleId="dashboard-stats-heading" gap="lg">
        <ul className="stat-grid">
          <Card as="li" variant="stat">
            <p className="card__stat-value">{isLoading ? "—" : (stats?.vocabPairCount ?? 0)}</p>
            <p className="card__stat-label">{t("dashboard.user.stats.vocabPairCount")}</p>
          </Card>
          <Card as="li" variant="stat">
            <p className="card__stat-value">{isLoading ? "—" : (stats?.dictionaryCount ?? 0)}</p>
            <p className="card__stat-label">{t("dashboard.user.stats.dictionaryCount")}</p>
          </Card>
          <Card as="li" variant="stat">
            <p className="card__stat-value">{isLoading ? "—" : (stats?.dueWordCount ?? 0)}</p>
            <p className="card__stat-label">{t("dashboard.user.stats.dueWordCount")}</p>
          </Card>
        </ul>
      </PageSection>
    </Page>
  );
}

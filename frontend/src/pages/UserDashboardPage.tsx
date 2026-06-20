import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { getDashboardStats } from "../api/user";
import Card from "../components/UI/Card";
import Page from "../components/UI/Page";
import PageHeader from "../components/UI/PageHeader";
import PageSection from "../components/UI/PageSection";
import type { UserDashboardStats } from "../types";
import { getStoredUser } from "../userStorage";

import "./style.scss";

function formatScorePercent(value: number | null, noScoreLabel: string): string {
  if (value === null) {
    return noScoreLabel;
  }
  return `${value}%`;
}

export default function UserDashboardPage() {
  const { t } = useTranslation();
  const user = getStoredUser();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardStats()
      .then((data) => {
        if (!cancelled) {
          setStats(data);
          setStatsError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStats(null);
          setStatsError(
            error instanceof Error ? error.message : t("dashboard.user.statsLoadFailed"),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const noScoreLabel = t("dashboard.user.stats.noScore");

  return (
    <Page>
      <PageHeader
        title={t("dashboard.user.heading")}
        subtitle={t("dashboard.user.intro", {
          name: user?.userName?.trim() ? user.userName : t("dashboard.user.fallbackName"),
        })}
      />

      <PageSection title={t("dashboard.user.statsTitle")} titleId="dashboard-stats-heading" gap="lg">
        {statsError ? (
          <p className="upload-file__error" role="alert">
            {statsError}
          </p>
        ) : null}
        <ul className="stat-grid">
          <Card as="li" variant="stat">
            <p className="card__stat-value">{stats?.quizzesGenerated ?? "—"}</p>
            <p className="card__stat-label">{t("dashboard.user.stats.quizzesGenerated")}</p>
          </Card>
          <Card as="li" variant="stat">
            <p className="card__stat-value">{stats?.quizzesCompleted ?? "—"}</p>
            <p className="card__stat-label">{t("dashboard.user.stats.quizzesCompleted")}</p>
          </Card>
          <Card as="li" variant="stat">
            <p className="card__stat-value">
              {stats ? formatScorePercent(stats.averageScorePercent, noScoreLabel) : "—"}
            </p>
            <p className="card__stat-label">{t("dashboard.user.stats.averageScore")}</p>
          </Card>
          <Card as="li" variant="stat">
            <p className="card__stat-value">
              {stats ? formatScorePercent(stats.bestScorePercent, noScoreLabel) : "—"}
            </p>
            <p className="card__stat-label">{t("dashboard.user.stats.bestScore")}</p>
          </Card>
        </ul>
      </PageSection>
    </Page>
  );
}

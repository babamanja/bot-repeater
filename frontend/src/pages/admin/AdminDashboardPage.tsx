import { useTranslation } from "react-i18next";

import ButtonLink from "../../components/UI/Button/ButtonLink";
import Card from "../../components/UI/Card";
import Page from "../../components/UI/Page";
import PageHeader from "../../components/UI/PageHeader";

import "../style.scss";

type AdminDashboardLink = {
  to: string;
  titleKey: string;
  descKey: string;
};

const LINKS: AdminDashboardLink[] = [
  { to: "/admin/users", titleKey: "dashboard.admin.links.users.title", descKey: "dashboard.admin.links.users.desc" },
  { to: "/admin/quizzes", titleKey: "dashboard.admin.links.quizzes.title", descKey: "dashboard.admin.links.quizzes.desc" },
  { to: "/admin/payments", titleKey: "dashboard.admin.links.payments.title", descKey: "dashboard.admin.links.payments.desc" },
  { to: "/admin/prompt", titleKey: "dashboard.admin.links.prompt.title", descKey: "dashboard.admin.links.prompt.desc" },
  { to: "/admin/qualification", titleKey: "dashboard.admin.links.qualification.title", descKey: "dashboard.admin.links.qualification.desc" },
  { to: "/admin/feedback", titleKey: "dashboard.admin.links.feedback.title", descKey: "dashboard.admin.links.feedback.desc" },
  { to: "/admin/token-settings", titleKey: "dashboard.admin.links.tokenSettings.title", descKey: "dashboard.admin.links.tokenSettings.desc" },
  { to: "/admin/token-analytics", titleKey: "dashboard.admin.links.tokenAnalytics.title", descKey: "dashboard.admin.links.tokenAnalytics.desc" },
];

export default function AdminDashboardPage() {
  const { t } = useTranslation();

  return (
    <Page>
      <PageHeader title={t("dashboard.admin.heading")} subtitle={t("dashboard.admin.intro")} />
      <ul className="link-card-grid">
        {LINKS.map((link) => (
          <Card as="li" key={link.to} className="link-card">
            <h2 className="link-card__title">{t(link.titleKey)}</h2>
            <p className="link-card__desc">{t(link.descKey)}</p>
            <ButtonLink to={link.to} style="primary">
              {t("dashboard.admin.open")}
            </ButtonLink>
          </Card>
        ))}
      </ul>
    </Page>
  );
}

import { useTranslation } from "react-i18next";

import ButtonLink from "../components/UI/Button/ButtonLink";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section>
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.description")}</p>
      <ButtonLink to="/">{t("notFound.home")}</ButtonLink>
    </section>
  );
}

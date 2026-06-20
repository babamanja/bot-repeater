import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { LEGAL_DOCUMENT_IDS, legalDocumentHref, type LegalDocumentId } from "./legalQuery";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  list?: string[];
  paragraphsAfter?: string[];
};

export type { LegalDocumentId };

type LegalDocumentContentProps = {
  documentId: LegalDocumentId;
};

export default function LegalDocumentContent({ documentId }: LegalDocumentContentProps) {
  const { t } = useTranslation();
  const baseKey = `legal.${documentId}`;
  const sections = t(`${baseKey}.sections`, { returnObjects: true }) as LegalSection[];
  const relatedDocuments = LEGAL_DOCUMENT_IDS.filter((id) => id !== documentId);

  return (
    <article className="legal-document">
      <header className="legal-document__intro">
        <h1 id="legal-document-title">{t(`${baseKey}.title`)}</h1>
        <p className="legal-document__updated">
          {t("legal.lastUpdated", { date: t(`${baseKey}.lastUpdatedDate`) })}
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} className="legal-document__section">
          <h2>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.list && section.list.length > 0 ? (
            <ul>
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.paragraphsAfter?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}

      <footer className="legal-document__footer">
        <nav className="legal-document__related" aria-label={t("legal.relatedLabel")}>
          {relatedDocuments.map((id) => (
            <Link key={id} to={legalDocumentHref(id)}>
              {t(`legal.${id}.title`)}
            </Link>
          ))}
        </nav>
      </footer>
    </article>
  );
}

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import LegalDocumentContent, { type LegalDocumentId } from "./LegalDocumentContent";

import "./legal.scss";

type LegalDocumentModalProps = {
  documentId: LegalDocumentId;
  onClose: () => void;
};

export default function LegalDocumentModal({ documentId, onClose }: LegalDocumentModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="legal-modal" role="presentation">
      <button
        type="button"
        className="legal-modal__backdrop"
        aria-label={t("auth.modalClose")}
        onClick={onClose}
      />
      <div
        className="legal-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-document-title"
      >
        <button
          type="button"
          className="legal-modal__close"
          onClick={onClose}
          aria-label={t("auth.modalClose")}
        >
          ×
        </button>
        <div className="legal-modal__body">
          <LegalDocumentContent documentId={documentId} />
        </div>
      </div>
    </div>
  );
}

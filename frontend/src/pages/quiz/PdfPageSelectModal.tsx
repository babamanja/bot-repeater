import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PdfPagePreview } from "../../config/generationUploadProfile";
import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

import "./PdfPageSelectModal.scss";

type PdfPageSelectModalProps = {
  open: boolean;
  fileName: string;
  pages: PdfPagePreview[];
  maxSelectablePages: number;
  onConfirm: (pageIndices: number[]) => void;
  onCancel: () => void;
};

export default function PdfPageSelectModal({
  open,
  fileName,
  pages,
  maxSelectablePages,
  onConfirm,
  onCancel,
}: PdfPageSelectModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set());
    }
  }, [open, pages]);

  const selectedCount = selected.size;
  const atLimit = selectedCount >= maxSelectablePages;

  const sortedPages = useMemo(
    () => pages.slice().sort((a, b) => a.pageIndex - b.pageIndex),
    [pages],
  );

  function togglePage(pageIndex: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
        return next;
      }
      if (next.size >= maxSelectablePages) {
        return next;
      }
      next.add(pageIndex);
      return next;
    });
  }

  function handleConfirm() {
    if (selectedCount < 1) {
      return;
    }
    onConfirm([...selected].sort((a, b) => a - b));
  }

  return (
    <Modal
      open={open}
      buttons={
        <>
          <Button
            onClick={handleConfirm}
            style="primary"
            disabled={selectedCount < 1}
          >
            {t("upload.pdfPageSelectSubmit", {
              count: selectedCount,
              max: maxSelectablePages,
            })}
          </Button>
          <Button onClick={onCancel} style="secondary">
            {t("upload.ocrConfirmCancel")}
          </Button>
        </>
      }
    >
      <div className="pdf-page-select-modal">
        <h1 className="pdf-page-select-modal__title">
          {t("upload.pdfPageSelectTitle")}
        </h1>
        <p className="pdf-page-select-modal__file">{fileName}</p>
        <p className="pdf-page-select-modal__description">
          {t("upload.pdfPageSelectDescription", {
            max: maxSelectablePages,
            total: pages.length,
          })}
        </p>
        <p className="pdf-page-select-modal__counter" aria-live="polite">
          {t("upload.pdfPageSelectCounter", {
            selected: selectedCount,
            max: maxSelectablePages,
          })}
        </p>
        <div className="pdf-page-select-modal__grid" role="list">
          {sortedPages.map((page) => {
            const isSelected = selected.has(page.pageIndex);
            const isDisabled = !isSelected && atLimit;
            return (
              <button
                key={page.pageIndex}
                type="button"
                role="listitem"
                className={[
                  "pdf-page-select-modal__card",
                  isSelected ? "pdf-page-select-modal__card--selected" : "",
                  isDisabled ? "pdf-page-select-modal__card--disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={isSelected}
                disabled={isDisabled}
                onClick={() => togglePage(page.pageIndex)}
              >
                <span className="pdf-page-select-modal__card-header">
                  <span className="pdf-page-select-modal__page-number">
                    {t("upload.pdfPageSelectPageLabel", {
                      number: page.pageNumber,
                    })}
                  </span>
                  {page.needsOcr ? (
                    <span className="pdf-page-select-modal__badge pdf-page-select-modal__badge--ocr">
                      {t("upload.pdfPageSelectNeedsOcr")}
                    </span>
                  ) : page.hasText ? (
                    <span className="pdf-page-select-modal__badge pdf-page-select-modal__badge--text">
                      {t("upload.pdfPageSelectHasText")}
                    </span>
                  ) : (
                    <span className="pdf-page-select-modal__badge pdf-page-select-modal__badge--empty">
                      {t("upload.pdfPageSelectEmpty")}
                    </span>
                  )}
                </span>
                <p className="pdf-page-select-modal__preview">
                  {page.preview.trim()
                    ? page.preview
                    : t("upload.pdfPageSelectNoPreview")}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

import { useTranslation } from "react-i18next";

import type { PdfOcrJob } from "../../api/file";
import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

type PdfOcrProgressModalProps = {
  open: boolean;
  job: PdfOcrJob | null;
  onCancel: () => void;
};

export default function PdfOcrProgressModal({
  open,
  job,
  onCancel,
}: PdfOcrProgressModalProps) {
  const { t } = useTranslation();
  if (!job) {
    return null;
  }

  const progressPercent =
    job.pagesNeedingOcr > 0
      ? Math.min(100, Math.round((job.pagesCompleted / job.pagesNeedingOcr) * 100))
      : 0;

  return (
    <Modal
      open={open}
      buttons={
        job.status === "processing" ? (
          <Button onClick={onCancel} style="secondary">
            {t("upload.pdfOcrProgressCancel")}
          </Button>
        ) : null
      }
    >
      <div className="ocr-confirm-modal pdf-ocr-progress-modal">
        <h1 className="ocr-confirm-modal__title">{t("upload.pdfOcrProgressTitle")}</h1>
        <p className="ocr-confirm-modal__file">{job.originalFilename}</p>
        <p className="ocr-confirm-modal__description">
          {t("upload.pdfOcrProgressDescription", {
            completed: job.pagesCompleted,
            total: job.pagesNeedingOcr,
          })}
        </p>
        <div
          className="pdf-ocr-progress-modal__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="pdf-ocr-progress-modal__bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="upload-file__char-hint">{progressPercent}%</p>
      </div>
    </Modal>
  );
}

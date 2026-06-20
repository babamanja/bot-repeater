import { useTranslation } from "react-i18next";

import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

type PdfOcrConfirmModalProps = {
  open: boolean;
  fileName: string;
  pagesNeedingOcr: number;
  totalPages: number;
  tokenCost: number;
  tokenBalance: number | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function PdfOcrConfirmModal({
  open,
  fileName,
  pagesNeedingOcr,
  totalPages,
  tokenCost,
  tokenBalance,
  onConfirm,
  onCancel,
}: PdfOcrConfirmModalProps) {
  const { t } = useTranslation();
  const hasInsufficientTokens =
    tokenBalance !== null && tokenBalance < tokenCost;

  return (
    <Modal
      open={open}
      buttons={
        <>
          <Button
            onClick={onConfirm}
            style="primary"
            disabled={hasInsufficientTokens}
          >
            {t("upload.pdfOcrConfirmSubmit", { cost: tokenCost })}
          </Button>
          <Button onClick={onCancel} style="secondary">
            {t("upload.ocrConfirmCancel")}
          </Button>
        </>
      }
    >
      <div className="ocr-confirm-modal">
        <h1 className="ocr-confirm-modal__title">{t("upload.pdfOcrConfirmTitle")}</h1>
        <p className="ocr-confirm-modal__file">{fileName}</p>
        <p className="ocr-confirm-modal__description">
          {tokenBalance === null
            ? t("upload.pdfOcrConfirmDescriptionNoBalance", {
                pagesNeedingOcr,
                totalPages,
                cost: tokenCost,
              })
            : t("upload.pdfOcrConfirmDescription", {
                pagesNeedingOcr,
                totalPages,
                cost: tokenCost,
                balance: tokenBalance,
              })}
        </p>
        {hasInsufficientTokens ? (
          <p className="ocr-confirm-modal__error" role="alert">
            {t("upload.ocrConfirmInsufficientTokens", {
              cost: tokenCost,
              balance: tokenBalance,
            })}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

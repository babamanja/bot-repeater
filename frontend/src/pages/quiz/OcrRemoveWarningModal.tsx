import { useTranslation } from "react-i18next";

import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

type OcrRemoveWarningModalProps = {
  open: boolean;
  fileName: string;
  canUploadDocument: boolean;
  isPremiumRequired: boolean;
  onUploadDocument: () => void;
  onConfirmRemove: () => void;
  onCancel: () => void;
};

export default function OcrRemoveWarningModal({
  open,
  fileName,
  canUploadDocument,
  isPremiumRequired,
  onUploadDocument,
  onConfirmRemove,
  onCancel,
}: OcrRemoveWarningModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      buttons={
        <>
          <Button onClick={onUploadDocument} style="primary" disabled={!canUploadDocument}>
            {t("upload.ocrRemoveWarningUploadDocument")}
          </Button>
          <Button onClick={onConfirmRemove} style="secondary">
            {t("upload.ocrRemoveWarningConfirm")}
          </Button>
          <Button onClick={onCancel} style="secondary">
            {t("upload.ocrRemoveWarningCancel")}
          </Button>
        </>
      }
    >
      <div className="ocr-confirm-modal">
        <h1 className="ocr-confirm-modal__title">{t("upload.ocrRemoveWarningTitle")}</h1>
        <p className="ocr-confirm-modal__file">{fileName}</p>
        <p className="ocr-confirm-modal__description">{t("upload.ocrRemoveWarningDescription")}</p>
        {isPremiumRequired ? (
          <p className="ocr-confirm-modal__error" role="status">
            {t("upload.uploadDocumentPremiumRequired")}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

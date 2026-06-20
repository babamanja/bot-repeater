import { useTranslation } from "react-i18next";

import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

type OcrConfirmModalProps = {
  open: boolean;
  fileName: string;
  tokenCost: number;
  tokenBalance: number | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function OcrConfirmModal({
  open,
  fileName,
  tokenCost,
  tokenBalance,
  onConfirm,
  onCancel,
}: OcrConfirmModalProps) {
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
            {t("upload.ocrConfirmSubmit", { cost: tokenCost })}
          </Button>
          <Button onClick={onCancel} style="secondary">
            {t("upload.ocrConfirmCancel")}
          </Button>
        </>
      }
    >
      <div className="ocr-confirm-modal">
        <h1 className="ocr-confirm-modal__title">{t("upload.ocrConfirmTitle")}</h1>
        <p className="ocr-confirm-modal__file">{fileName}</p>
        <p className="ocr-confirm-modal__description">
          {tokenBalance === null
            ? t("upload.ocrConfirmDescriptionNoBalance", { cost: tokenCost })
            : t("upload.ocrConfirmDescription", {
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

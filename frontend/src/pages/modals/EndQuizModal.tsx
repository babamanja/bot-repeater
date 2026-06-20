import { useTranslation } from "react-i18next";

import Button from "../../components/UI/Button/Button";
import Modal from "../../components/UI/Modal";

import "./style.scss";

type EndQuizModalProps = {
  open: boolean;
  type: "finish" | "quit";
  onCancel: () => void;
  onSubmit: () => void;
};

export default function EndQuizModal({ open, type, onCancel, onSubmit }: EndQuizModalProps) {
  const { t } = useTranslation();
  const keyBase = `modal.${type}`;
  return (
    <Modal
      open={open}
      buttons={
        <>
          <Button onClick={onSubmit} style="primary">
            {t(`${keyBase}.submit`)}
          </Button>
          <Button onClick={onCancel} style="secondary">
            {t(`${keyBase}.cancel`)}
          </Button>
        </>
      }
    >
      <div className="end-quiz-modal">
        <h1>{t(`${keyBase}.title`)}</h1>
        <p>{t(`${keyBase}.subtitle`)}</p>
      </div>
    </Modal>
  );
}

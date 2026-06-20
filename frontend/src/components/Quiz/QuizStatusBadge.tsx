import { useTranslation } from "react-i18next";

import type { QuizStatus } from "../../types";

type QuizStatusBadgeProps = {
  status: QuizStatus;
};

function displayStatus(status: QuizStatus): QuizStatus {
  return status === "ready_to_edit" ? "published" : status;
}

export default function QuizStatusBadge({ status }: QuizStatusBadgeProps) {
  const { t } = useTranslation();
  const shown = displayStatus(status);

  return (
    <span className={`quiz-status quiz-status--${shown}`}>
      {t(`quizList.status.${shown}`)}
    </span>
  );
}

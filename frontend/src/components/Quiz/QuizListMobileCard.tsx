import {
  faCircleCheck,
  faFileLines,
  faPen,
  faPlay,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "react-i18next";

import Button from "../UI/Button/Button";
import ButtonLink from "../UI/Button/ButtonLink";
import IconComponent from "../UI/Icon";
import type { Quiz, QuizStatus } from "../../types";
import { formatRelativeTime } from "../../utils/convertTime";
import QuizStatusBadge from "./QuizStatusBadge";

function isPlayableQuiz(status: QuizStatus): boolean {
  return status === "published" || status === "ready_to_edit";
}

type QuizListMobileSummaryProps = {
  quiz: Quiz;
  title: string;
  highlighted?: boolean;
};

export function QuizListMobileSummary({ quiz, title, highlighted }: QuizListMobileSummaryProps) {
  const { t } = useTranslation();
  const questionCount = quiz.questions.length;
  const timeLabel = quiz.createdAt ? formatRelativeTime(quiz.createdAt) : null;
  const showCheck =
    quiz.status === "published" || quiz.status === "ready_to_edit";

  return (
    <div className="quiz-list-card__summary-inner">
      <span className="quiz-list-card__icon" aria-hidden>
        <IconComponent faIcon={faFileLines} iconClassName="quiz-list-card__icon-glyph" />
      </span>
      <div className="quiz-list-card__head">
        <span
          className={`quiz-list-card__title${highlighted ? " quiz-list-card__title--highlight" : ""}`}
        >
          {title}
        </span>
        <p className="quiz-list-card__meta">
          {timeLabel
            ? t("quizList.questionCountMeta", { count: questionCount, time: timeLabel })
            : t("quizList.questionCount", { count: questionCount })}
        </p>
      </div>
      <div className="quiz-list-card__status">
        {showCheck ? (
          <IconComponent
            faIcon={faCircleCheck}
            iconClassName="quiz-list-card__status-icon"
          />
        ) : null}
        <QuizStatusBadge status={quiz.status} />
      </div>
    </div>
  );
}

type QuizListMobileFooterProps = {
  quiz: Quiz;
  isRegenerating: boolean;
  isRefunding: boolean;
  onDelete: () => void;
  onRegenerate: () => void;
  onRefund: () => void;
};

export function QuizListMobileFooter({
  quiz,
  isRegenerating,
  isRefunding,
  onDelete,
  onRegenerate,
  onRefund,
}: QuizListMobileFooterProps) {
  const { t } = useTranslation();
  const canPlay = isPlayableQuiz(quiz.status);
  const isBusy = isRegenerating || isRefunding;

  return (
    <div className="quiz-list-card__footer-inner">
      <div className="quiz-list-card__primary-actions">
        {quiz.status === "failed" ? (
          <>
            {quiz.canRegenerate ? (
              <Button
                type="button"
                style="secondary"
                className="quiz-list-card__edit"
                disabled={isBusy}
                onClick={onRegenerate}
              >
                {isRegenerating ? t("quizList.regenerating") : t("quizList.regenerate")}
              </Button>
            ) : null}
            {quiz.canRefundTokens ? (
              <Button
                type="button"
                style="secondary"
                className="quiz-list-card__edit"
                disabled={isBusy}
                onClick={onRefund}
              >
                {isRefunding ? t("quizList.refundingTokens") : t("quizList.refundTokens")}
              </Button>
            ) : quiz.tokensRefunded ? (
              <span className="quiz-list__action-muted">{t("quizList.tokensRefundedLabel")}</span>
            ) : null}
          </>
        ) : null}
        {canPlay ? (
          <ButtonLink
            to={`/edit-quiz/${quiz.id}`}
            style="secondary"
            className="quiz-list-card__edit"
          >
            <IconComponent faIcon={faPen} iconClassName="quiz-list-card__btn-icon" />
            <span>{t("quizList.edit")}</span>
          </ButtonLink>
        ) : null}
        {canPlay ? (
          <ButtonLink to={`/quiz/${quiz.id}`} style="primary" className="quiz-list-card__take">
            <IconComponent faIcon={faPlay} iconClassName="quiz-list-card__btn-icon" />
            <span>{t("quizList.takeQuiz")}</span>
          </ButtonLink>
        ) : null}
      </div>
      <button
        type="button"
        className="quiz-list-card__delete"
        aria-label={t("quizList.delete")}
        title={t("quizList.delete")}
        onClick={onDelete}
      >
        <IconComponent faIcon={faTrashCan} iconClassName="quiz-list-card__btn-icon" />
      </button>
    </div>
  );
}

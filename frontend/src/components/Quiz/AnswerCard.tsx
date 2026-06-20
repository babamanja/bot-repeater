import { useTranslation } from "react-i18next";

import { useQuizEditContext } from "../../context/useQuizEditContext";
import type { QuizAnswerExtended } from "../../types";
import Checkbox from "../UI/Checkbox";
import TextInput from "../UI/TextInput";

import "./style.scss";

type AnswerCardState = "test" | "check" | "edit";

type ShowAnswerCardProps = {
  answer: QuizAnswerExtended;
  colorNumber: number;
  cardStyle: string;
  isSelected: boolean;
  isCorrect: boolean;
  state: AnswerCardState;
  disabled?: boolean;
  onClick?: (answerId: string) => void;
};

export function ShowAnswerCard({
  answer,
  colorNumber,
  cardStyle,
  isSelected,
  isCorrect,
  state,
  disabled = false,
  onClick,
}: ShowAnswerCardProps) {
  const { t } = useTranslation();

  function handleClick() {
    if (!disabled) {
      onClick?.(answer.answerId);
    }
  }

  const isCheckState = state === "check";
  const showSelectedStyle = isSelected && state === "test";
  const showYourAnswerBadge = isCheckState && isSelected;
  const reviewImageSrc = isCorrect
    ? "/mascots/correct-answer.png"
    : "/mascots/not-correct-answer.png";
  const reviewImageAlt = isCorrect
    ? t("quiz.correctAnswerImageAlt")
    : t("quiz.incorrectAnswerImageAlt");

  return (
    <section
      className={`
        answer-card answer-card--${cardStyle}
        answer-card-color-${colorNumber}
        ${showSelectedStyle ? "answer-card__text--selected" : ""}
        ${disabled && !isCheckState ? "answer-card--disabled" : ""}
        ${isCheckState ? "answer-card--check" : ""}
        ${isCheckState && isCorrect ? "answer-card--review-correct" : ""}
        ${isCheckState && isSelected && !isCorrect ? "answer-card--review-incorrect" : ""}
        ${isCheckState && !isSelected && !isCorrect ? "answer-card--review-neutral" : ""}
      `}
      onClick={handleClick}
    >
      {showYourAnswerBadge ? (
        <div className="answer-card__top">
          <span className="answer-card__badge answer-card__badge--your-answer">{t("quiz.yourAnswer")}</span>
          <img
            className="answer-card__media"
            src={reviewImageSrc}
            alt={reviewImageAlt}
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : null}
      <section className="answer-card__text">{answer.text}</section>
    </section>
  );
}

type EditAnswerCardProps = {
  answer: QuizAnswerExtended;
  correctAnswerIds: string[];
  questionId: string;
  answerId: string;
  colorNumber: number;
};

function EditAnswerCard({
  answer,
  correctAnswerIds,
  questionId,
  answerId,
  colorNumber,
}: EditAnswerCardProps) {
  const { updateAnswer, updateCorrectAnswer } = useQuizEditContext();
  const isCorrect = correctAnswerIds.includes(answerId);

  return (
    <section
      className={`answer-card answer-card--edit ${isCorrect ? "answer-card--edit-correct" : ""}`}
    >
      <TextInput
        label={`Answer ${colorNumber + 1}`}
        value={answer.text ?? ""}
        onChange={(value) => updateAnswer(questionId, answerId, value)}
      />
      <Checkbox
        label="Correct Answer"
        checked={isCorrect}
        onChange={(checked) => updateCorrectAnswer(questionId, answerId, checked)}
      />
    </section>
  );
}

type AnswerCardProps = {
  answer: QuizAnswerExtended;
  correctAnswerIds: string[];
  questionId: string;
  answerId: string;
  colorNumber: number;
  cardStyle: string;
  isSelected: boolean;
  isCorrect: boolean;
  state: AnswerCardState;
  disabled?: boolean;
  onClick?: (answerId: string) => void;
};

export default function AnswerCard({
  answer,
  correctAnswerIds,
  questionId,
  answerId,
  colorNumber,
  cardStyle,
  isSelected,
  isCorrect,
  state,
  disabled = false,
  onClick,
}: AnswerCardProps) {
  if (state === "edit") {
    return (
      <EditAnswerCard
        answer={answer}
        correctAnswerIds={correctAnswerIds}
        questionId={questionId}
        answerId={answerId}
        colorNumber={colorNumber}
      />
    );
  }
  return (
    <ShowAnswerCard
      answer={answer}
      colorNumber={colorNumber}
      cardStyle={cardStyle}
      isSelected={isSelected}
      isCorrect={isCorrect}
      state={state}
      disabled={disabled}
      onClick={onClick}
    />
  );
}

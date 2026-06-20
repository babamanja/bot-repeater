import AnswerCard from "./AnswerCard";
import { useQuizEditContextOptional } from "../../context/useQuizEditContext";
import type { Quiz, QuizExtended } from "../../types";
import { findQuestionInQuiz } from "../../utils/quizEditUpdates";
import { getQuestionOutcome } from "../../utils/quizQuestionOutcome";
import TextInput from "../UI/TextInput";

type QuizContainerProps = {
  questionId: string;
  state: "test" | "check" | "edit";
  quiz?: Quiz | QuizExtended;
  selectedAnswerIds?: string[];
  disabled?: boolean;
  onClick?: (answerId: string) => void;
};

export default function QuizContainer({
  questionId,
  state,
  quiz: quizProp,
  selectedAnswerIds,
  disabled = false,
  onClick,
}: QuizContainerProps) {
  const editCtx = useQuizEditContextOptional();
  const effectiveQuiz = state === "edit" ? (editCtx?.quiz ?? null) : (quizProp ?? null);

  if (state === "edit" && !editCtx) {
    return null;
  }
  if (!effectiveQuiz) {
    return null;
  }

  const currentQuestion = findQuestionInQuiz(effectiveQuiz as QuizExtended, questionId);
  const { prompt, options, correctAnswerIds } = currentQuestion ?? {};
  const isMultipleChoice =
    (correctAnswerIds?.length ?? 0) > 1 || Boolean(currentQuestion?.isMultipleChoice);
  const updatePrompt = editCtx?.updatePrompt;
  const questionOutcome =
    state === "check"
      ? getQuestionOutcome(
          selectedAnswerIds ?? [],
          correctAnswerIds ?? [],
          isMultipleChoice,
        )
      : null;

  return (
    <section
      key={questionId}
      className={`quiz-wrapper${isMultipleChoice ? " quiz-wrapper--multiple-choice" : ""}${
        questionOutcome ? ` quiz-wrapper--outcome-${questionOutcome}` : ""
      }`}
    >
      {state !== "edit" ? (
        <h2>
          {prompt} {isMultipleChoice ? "(Multiple Choice)" : ""}
        </h2>
      ) : (
        <TextInput
          label={`Prompt ${isMultipleChoice ? "(Multiple Choice)" : ""}`}
          value={currentQuestion?.prompt}
          onChange={(value) => updatePrompt?.(questionId, value)}
        />
      )}
      <section className="quiz-container">
        {options?.map((answer, index) => (
          <AnswerCard
            key={answer.answerId}
            answer={answer}
            correctAnswerIds={correctAnswerIds ?? []}
            questionId={questionId}
            answerId={answer.answerId}
            colorNumber={index}
            cardStyle="default"
            state={state}
            isSelected={(selectedAnswerIds ?? []).includes(answer.answerId)}
            isCorrect={(correctAnswerIds ?? []).includes(answer.answerId)}
            disabled={disabled}
            onClick={onClick}
          />
        ))}
      </section>
    </section>
  );
}

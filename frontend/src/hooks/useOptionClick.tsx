import { useEffect, useMemo, useState } from "react";

import type { QuizExtended } from "../types";

type SelectedAnswer = { questionId: string; answerIds: string[] };

function buildSelectedAnswers(
  questions: QuizExtended["questions"],
  initialAnswers?: SelectedAnswer[],
): SelectedAnswer[] {
  const byQuestionId = new Map(
    (initialAnswers ?? []).map((entry) => [entry.questionId, entry.answerIds]),
  );
  return questions.map((question) => ({
    questionId: question.id,
    answerIds: byQuestionId.get(question.id) ?? [],
  }));
}

function useOptionClick(quiz?: QuizExtended | null, initialAnswers?: SelectedAnswer[]) {
  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswer[]>(() =>
    buildSelectedAnswers(questions, initialAnswers),
  );

  useEffect(() => {
    setSelectedAnswers(buildSelectedAnswers(questions, initialAnswers));
  }, [questions, initialAnswers]);

  function handleSingleChoiceClick(questionId: string, answerId: string) {
    setSelectedAnswers((prev) =>
      prev.map((entry) => {
        if (entry.questionId !== questionId) {
          return entry;
        }
        if (entry.answerIds[0] === answerId) {
          return { ...entry, answerIds: [] };
        }
        return { ...entry, answerIds: [answerId] };
      }),
    );
  }

  function handleMultipleChoiceClick(questionId: string, answerId: string) {
    setSelectedAnswers((prev) =>
      prev.map((entry) => {
        if (entry.questionId !== questionId) {
          return entry;
        }
        if (entry.answerIds.includes(answerId)) {
          return { ...entry, answerIds: entry.answerIds.filter((id) => id !== answerId) };
        }
        return { ...entry, answerIds: [...entry.answerIds, answerId] };
      }),
    );
  }

  function handleClick(questionId: string, answerId: string) {
    if (!quiz) {
      return;
    }
    const question = questions.find((entry) => entry.id === questionId);
    if (question?.isMultipleChoice) {
      handleMultipleChoiceClick(questionId, answerId);
    } else {
      handleSingleChoiceClick(questionId, answerId);
    }
  }

  return { selectedAnswers, handleClick };
}

export default useOptionClick;

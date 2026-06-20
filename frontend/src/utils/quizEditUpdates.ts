import type { QuizAnswerExtended, QuizExtended, QuizQuestionExtended } from "../types";

export function findQuestionInQuiz(
  quiz: QuizExtended | null,
  questionId: string,
): QuizQuestionExtended | undefined {
  return quiz?.questions.find((q) => q.id === questionId);
}

export function findAnswerInQuiz(
  quiz: QuizExtended,
  questionId: string,
  answerId: string,
): QuizAnswerExtended | undefined {
  const question = findQuestionInQuiz(quiz, questionId);
  return question?.options.find((o) => o.answerId === answerId);
}

export function updateTitleInQuiz(quiz: QuizExtended, title: string): QuizExtended {
  return { ...quiz, title };
}

export function updatePromptInQuiz(
  quiz: QuizExtended,
  questionId: string,
  prompt: string,
): QuizExtended {
  return {
    ...quiz,
    questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, prompt } : q)),
  };
}

export function updateAnswerInQuiz(
  quiz: QuizExtended,
  questionId: string,
  answerId: string,
  value: string,
): QuizExtended {
  if (!findAnswerInQuiz(quiz, questionId, answerId)) {
    return quiz;
  }

  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      if (q.id !== questionId) {
        return q;
      }
      return {
        ...q,
        options: q.options.map((o) =>
          o.answerId === answerId ? { ...o, text: value } : o,
        ),
      };
    }),
  };
}

export function updateCorrectAnswerInQuiz(
  quiz: QuizExtended,
  questionId: string,
  answerId: string,
  isCorrect: boolean,
): QuizExtended {
  if (!findQuestionInQuiz(quiz, questionId)) {
    return quiz;
  }

  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      if (q.id !== questionId) {
        return q;
      }
      let ids = [...(q.correctAnswerIds ?? [])];
      if (isCorrect) {
        if (!ids.includes(answerId)) {
          ids.push(answerId);
        }
      } else {
        ids = ids.filter((id) => id !== answerId);
      }
      return {
        ...q,
        correctAnswerIds: ids,
      };
    }),
  };
}

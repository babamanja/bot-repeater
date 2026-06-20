import type { InternalQuizPayload } from "../types/internalQuiz.js";
import type { QuizCheckAnswerPayloadDto } from "./dto/quizCheckAnswerPayload.dto.js";

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

/** Compare submitted answers to the stored key; order of ids does not matter. */
export function scoreAttempt(
  internal: InternalQuizPayload,
  answers: QuizCheckAnswerPayloadDto[],
): { correctCount: number; questionCount: number } {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a.answerIds]));
  let correct = 0;
  for (const q of internal.questions) {
    const selected = byQuestion.get(q.id) ?? [];
    if (setsEqual(selected, q.correctAnswerIds)) {
      correct++;
    }
  }
  return { correctCount: correct, questionCount: internal.questions.length };
}

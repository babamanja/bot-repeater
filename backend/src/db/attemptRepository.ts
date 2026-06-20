import { AttemptDto } from "../services/dto/attemptDto.js";
import type { QuizCheckAnswerPayloadDto } from "../services/dto/quizCheckAnswerPayload.dto.js";
import type { InternalQuizPayload } from "../types/internalQuiz.js";
import { getPrisma } from "./prisma.js";
import { AttemptListRow, selectQuizById } from "./quizRepository.js";

export async function selectAttemptsByUserId(
  userId: number,
): Promise<AttemptListRow[]> {
  const rows = await getPrisma().quizAttempt.findMany({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
    select: {
      id: true,
      quizId: true,
      acceptedAt: true,
      correctCount: true,
      questionCount: true,
      quizVersion: true,
      userId: true,
      quiz: {
        select: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { title: true },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const acceptedAt =
      row.acceptedAt instanceof Date
        ? row.acceptedAt.toISOString()
        : String(row.acceptedAt);
    const quizTitle = row.quiz.versions[0]?.title ?? "";

    return {
      attemptId: row.id,
      quizId: row.quizId,
      acceptedAt,
      correctCount: row.correctCount,
      questionCount: row.questionCount,
      quizVersion: row.quizVersion,
      userId: row.userId,
      quizTitle,
    };
  });
}

export async function selectAttemptById(
  attemptId: string,
): Promise<AttemptDto | null> {
  const row = await getPrisma().quizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      quizId: true,
      userId: true,
      quizVersion: true,
      questionSnapshot: true,
      answers: true,
      acceptedAt: true,
      correctCount: true,
      questionCount: true,
      quiz: {
        select: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { title: true },
          },
        },
      },
    },
  });
  if (!row) return null;

  const fromSnapshot = row.questionSnapshot as InternalQuizPayload | null;
  const fallback = await selectQuizById(row.quizId);
  const snapshot = fromSnapshot ?? fallback;
  if (!snapshot) return null;

  const quizTitle = row.quiz.versions[0]?.title ?? "";

  const answers = row.answers as QuizCheckAnswerPayloadDto[];
  const acceptedAt =
    row.acceptedAt instanceof Date
      ? row.acceptedAt.toISOString()
      : String(row.acceptedAt);

  return {
    id: row.id,
    quizId: row.quizId,
    userId: row.userId,
    quizTitle,
    acceptedAt,
    correctCount: row.correctCount,
    questionCount: row.questionCount,
    quizVersion: row.quizVersion,
    questions: snapshot.questions,
    answers,
  };
}

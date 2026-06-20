import type { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import type { InternalQuizPayload } from "../types/internalQuiz.js";
import type { QuizStatus } from "../types/quizStatus.js";
import type { QuizCheckAnswerPayloadDto } from "../services/dto/quizCheckAnswerPayload.dto.js";

type QuizVersionGraph = {
  title: string;
  version: number;
  questions: Array<{
    questionId: string;
    prompt: string;
    correctAnswerIds: string[];
    position: number;
    options: Array<{
      answerId: string;
      text: string;
      position: number;
    }>;
  }>;
};

function toInternalPayload(version: QuizVersionGraph): InternalQuizPayload {
  return {
    title: version.title,
    questions: [...version.questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.questionId,
        prompt: question.prompt,
        correctAnswerIds: question.correctAnswerIds,
        options: [...question.options]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({
            answerId: option.answerId,
            text: option.text,
          })),
      })),
  };
}

function mapVersionCreateData(payload: InternalQuizPayload) {
  return {
    title: payload.title,
    questions: {
      create: payload.questions.map((question, questionPosition) => ({
        questionId: question.id,
        prompt: question.prompt,
        correctAnswerIds: question.correctAnswerIds,
        position: questionPosition,
        options: {
          create: question.options.map((option, optionPosition) => ({
            answerId: option.answerId,
            text: option.text,
            position: optionPosition,
          })),
        },
      })),
    },
  };
}

export type QuizGenerationContext = {
  id: string;
  status: QuizStatus;
  createdBy: number | null;
  documentId: string | null;
  chunkId: string | null;
  generationSourceText: string | null;
  generationQuestionCount: number | null;
  generationLanguage: string | null;
  generationTokensCharged: number | null;
  tokensRefundedAt: Date | null;
};

export async function insertPendingQuiz(
  id: string,
  createdByUserId: number,
  generation: {
    sourceText: string;
    questionCount: number;
    languageCode: string;
    tokensCharged: number;
    documentId?: string | null;
    chunkId?: string | null;
  },
): Promise<void> {
  await getPrisma().quiz.create({
    data: {
      id,
      createdBy: createdByUserId,
      status: "generating",
      documentId: generation.documentId ?? null,
      chunkId: generation.chunkId ?? null,
      generationSourceText: generation.sourceText,
      generationQuestionCount: generation.questionCount,
      generationLanguage: generation.languageCode,
      generationTokensCharged: generation.tokensCharged,
    },
  });
}

export async function selectQuizGenerationContext(
  quizId: string,
): Promise<QuizGenerationContext | null> {
  const row = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      status: true,
      createdBy: true,
      documentId: true,
      chunkId: true,
      generationSourceText: true,
      generationQuestionCount: true,
      generationLanguage: true,
      generationTokensCharged: true,
      tokensRefundedAt: true,
    },
  });
  return row ?? null;
}

export async function resetQuizForRegeneration(quizId: string): Promise<boolean> {
  const result = await getPrisma().quiz.updateMany({
    where: { id: quizId, status: "failed" },
    data: { status: "generating", errorMessage: null },
  });
  return result.count > 0;
}

export async function markQuizTokensRefunded(
  quizId: string,
  userId: number,
): Promise<boolean> {
  const result = await getPrisma().quiz.updateMany({
    where: {
      id: quizId,
      createdBy: userId,
      status: "failed",
      tokensRefundedAt: null,
    },
    data: { tokensRefundedAt: new Date() },
  });
  return result.count > 0;
}

export async function updateQuizStatus(
  quizId: string,
  status: QuizStatus,
): Promise<void> {
  await getPrisma().quiz.update({
    where: { id: quizId },
    data: { status },
  });
}

function normalizeQuizErrorMessage(errorMessage: string | null | undefined): string | null {
  const trimmed = errorMessage?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 2000);
}

/** Marks quiz failed only while it is still generating (avoids overwriting success). */
export async function failQuizIfGenerating(
  quizId: string,
  errorMessage?: string | null,
): Promise<boolean> {
  const result = await getPrisma().quiz.updateMany({
    where: { id: quizId, status: "generating" },
    data: {
      status: "failed",
      errorMessage: normalizeQuizErrorMessage(errorMessage),
    },
  });
  return result.count > 0;
}

const STALE_QUIZ_GENERATION_ERROR = "quiz generation timed out";

/** Fails quizzes stuck in generating past the configured timeout (e.g. after server restart). */
export async function failStaleGeneratingQuizzes(olderThan: Date): Promise<number> {
  const result = await getPrisma().quiz.updateMany({
    where: {
      status: "generating",
      createdAt: { lt: olderThan },
    },
    data: {
      status: "failed",
      errorMessage: STALE_QUIZ_GENERATION_ERROR,
    },
  });
  return result.count;
}

export async function selectQuizStatus(quizId: string): Promise<QuizStatus | null> {
  const row = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    select: { status: true },
  });
  return row?.status ?? null;
}

export async function selectQuizErrorMessage(quizId: string): Promise<string | null> {
  const row = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    select: { errorMessage: true },
  });
  return row?.errorMessage?.trim() || null;
}

/** Persists generated quiz only if generation has not already failed or timed out. */
export async function insertQuizVersionIfGenerating(
  quizId: string,
  payload: InternalQuizPayload,
  status: Extract<QuizStatus, "published">,
): Promise<boolean> {
  return getPrisma().$transaction(async (tx) => {
    const updated = await tx.quiz.updateMany({
      where: { id: quizId, status: "generating" },
      data: { status },
    });
    if (updated.count === 0) {
      return false;
    }
    await tx.quizVersion.create({
      data: {
        quizId,
        version: 1,
        ...mapVersionCreateData(payload),
      },
    });
    return true;
  });
}

/** @deprecated Use insertPendingQuiz + insertQuizVersion for new flows. */
export async function insertQuiz(
  id: string,
  payload: InternalQuizPayload,
  createdByUserId: number | null,
): Promise<void> {
  await getPrisma().$transaction(async (tx) => {
    await tx.quiz.create({
      data: {
        id,
        createdBy: createdByUserId ?? undefined,
        status: "published",
      },
    });
    await tx.quizVersion.create({
      data: {
        quizId: id,
        version: 1,
        ...mapVersionCreateData(payload),
      },
    });
  });
}

type QuizReadRow = {
  title: string;
  questions: QuizVersionGraph["questions"];
  version: number;
};

async function selectQuizLatestPayloadAndVersion(
  quizId: string,
): Promise<QuizReadRow | null> {
  const version = await getPrisma().quizVersion.findFirst({
    where: { quizId },
    orderBy: { version: "desc" },
    select: {
      title: true,
      version: true,
      questions: {
        orderBy: { position: "asc" },
        select: {
          questionId: true,
          prompt: true,
          correctAnswerIds: true,
          position: true,
          options: {
            orderBy: { position: "asc" },
            select: {
              answerId: true,
              text: true,
              position: true,
            },
          },
        },
      },
    },
  });
  if (!version) return null;
  return version;
}

export async function selectQuizById(
  id: string,
): Promise<InternalQuizPayload | null> {
  const row = await selectQuizLatestPayloadAndVersion(id);
  if (!row) return null;
  return toInternalPayload(row);
}

export async function selectQuizByIdWithVersion(
  id: string,
): Promise<{ payload: InternalQuizPayload; version: number } | null> {
  const row = await selectQuizLatestPayloadAndVersion(id);
  if (!row) return null;
  return {
    payload: toInternalPayload(row),
    version: row.version,
  };
}

export type QuizListRow = {
  id: string;
  title: string;
  status: QuizStatus;
  created_at: Date;
  created_by: number | null;
  document_id: string | null;
  chunk_index: number | null;
  generation_source_text: string | null;
  generation_tokens_charged: number | null;
  tokens_refunded_at: Date | null;
  error_message: string | null;
};

export async function selectQuizzesByCreatedBy(
  userId: number,
): Promise<QuizListRow[]> {
  const rows = await getPrisma().quiz.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      createdBy: true,
      documentId: true,
      generationSourceText: true,
      generationTokensCharged: true,
      tokensRefundedAt: true,
      errorMessage: true,
      chunk: {
        select: { chunkIndex: true },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { title: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.versions[0]?.title ?? "",
    status: r.status,
    created_at: r.createdAt,
    created_by: r.createdBy,
    document_id: r.documentId,
    chunk_index: r.chunk?.chunkIndex ?? null,
    generation_source_text: r.generationSourceText,
    generation_tokens_charged: r.generationTokensCharged,
    tokens_refunded_at: r.tokensRefundedAt,
    error_message: r.errorMessage,
  }));
}

export async function countQuizzesByCreatedBy(userId: number): Promise<number> {
  return getPrisma().quiz.count({
    where: { createdBy: userId },
  });
}

export async function selectQuizCreatedBy(
  quizId: string,
): Promise<number | null> {
  const row = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    select: { createdBy: true },
  });
  return row?.createdBy ?? null;
}

export type DeleteQuizOutcome = "deleted" | "not_found" | "forbidden";

export async function deleteQuizForUser(
  quizId: string,
  userId: number,
): Promise<DeleteQuizOutcome> {
  const row = await getPrisma().quiz.findUnique({
    where: { id: quizId },
    select: { createdBy: true },
  });
  if (!row) {
    return "not_found";
  }
  if (row.createdBy === null || row.createdBy !== userId) {
    return "forbidden";
  }
  await getPrisma().quiz.delete({ where: { id: quizId } });
  return "deleted";
}

export async function updateQuizWithNewVersion(
  quizId: string,
  payload: InternalQuizPayload,
): Promise<number | null> {
  return await getPrisma().$transaction(async (tx) => {
    const quiz = await tx.quiz.findUnique({
      where: { id: quizId },
      select: { id: true },
    });
    if (!quiz) return null;

    const latest = await tx.quizVersion.findFirst({
      where: { quizId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    await tx.quizVersion.create({
      data: {
        quizId,
        version: nextVersion,
        ...mapVersionCreateData(payload),
      },
    });

    return nextVersion;
  });
}

export async function updateQuizDocumentLink(
  quizId: string,
  documentId: string,
  chunkId: string | null,
): Promise<void> {
  await getPrisma().quiz.update({
    where: { id: quizId },
    data: { documentId, chunkId },
  });
}

export async function deleteAttemptsForQuizUser(
  quizId: string,
  userId: number,
): Promise<number> {
  const result = await getPrisma().quizAttempt.deleteMany({
    where: { quizId, userId },
  });
  return result.count;
}

export async function insertQuizAttempt(
  quizId: string,
  quizVersion: number,
  questionSnapshot: InternalQuizPayload,
  userId: number | null,
  answers: QuizCheckAnswerPayloadDto[],
  acceptedAtIso: string,
  correctCount: number,
  questionCount: number,
): Promise<string> {
  const created = await getPrisma().quizAttempt.create({
    data: {
      quizId,
      quizVersion,
      userId: userId ?? undefined,
      questionSnapshot: questionSnapshot as unknown as Prisma.InputJsonValue,
      answers: answers as unknown as Prisma.InputJsonValue,
      acceptedAt: new Date(acceptedAtIso),
      correctCount,
      questionCount,
    },
    select: { id: true },
  });
  return created.id;
}

export type LatestAttemptRow = {
  answers: QuizCheckAnswerPayloadDto[];
  questionSnapshot: InternalQuizPayload;
  quizVersion: number;
  acceptedAt: string;
  correctCount: number;
  questionCount: number;
  attemptId: string;
  userId: number | null;
};

export type AttemptListRow = {
  attemptId: string;
  quizId: string;
  acceptedAt: string;
  correctCount: number;
  questionCount: number;
  quizVersion: number;
  userId: number | null;
  quizTitle: string;
};

export async function selectLatestAttemptByQuizId(
  quizId: string,
): Promise<LatestAttemptRow | null> {
  const row = await getPrisma().quizAttempt.findFirst({
    where: { quizId },
    orderBy: { acceptedAt: "desc" },
  });
  if (!row) return null;
  const answers = row.answers as QuizCheckAnswerPayloadDto[];
  const fallbackSnapshot = await selectQuizById(quizId);
  const questionSnapshot =
    (row.questionSnapshot as InternalQuizPayload | null) ?? fallbackSnapshot;
  if (!questionSnapshot) return null;
  const at = row.acceptedAt;
  const acceptedAt = at instanceof Date ? at.toISOString() : String(at);
  return {
    attemptId: row.id,
    answers,
    questionSnapshot,
    quizVersion: row.quizVersion,
    acceptedAt,
    correctCount: row.correctCount,
    questionCount: row.questionCount,
    userId: row.userId,
  };
}

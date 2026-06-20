import * as quizRepository from "../db/quizRepository.js";
import * as tokenRepository from "../db/tokenRepository.js";
import * as userRepository from "../db/userRepository.js";
import * as documentService from "./document.service.js";
import { FullQuizDto } from "./dto/quizDto.js";
import { scoreAttempt } from "./quizScoring.js";
import {
  assertQuizOwner,
  isFullQuizDto,
  isValidAnswersPayload,
  removePrivateDataFromQuestion,
} from "./quizValidation.service.js";
import {
  estimateQuestionCount,
  getGenerationSettings,
} from "./generationSettings.service.js";
import { resolveQuizLanguageOrDefault } from "../config/quizLanguages.js";
import { getQuizGenerationTimeoutMs } from "../config/quizGeneration.js";
import { isQuizPlayable } from "../types/quizStatus.js";
import { scheduleQuizGenerationContinue } from "./quizGenerationChain.service.js";

async function expireStaleGeneratingQuizzes(): Promise<void> {
  const timeoutMs = getQuizGenerationTimeoutMs();
  const cutoff = new Date(Date.now() - timeoutMs);
  await quizRepository.failStaleGeneratingQuizzes(cutoff);
}

async function resolveQuizSourceText(
  context: quizRepository.QuizGenerationContext,
  userId: number,
): Promise<string | null> {
  const stored = context.generationSourceText?.trim() ?? "";
  if (stored) {
    return stored;
  }
  if (!context.documentId) {
    return null;
  }
  const resolved = await documentService.resolveDocumentChunkForGeneration(
    context.documentId,
    userId,
    context.chunkId ?? undefined,
  );
  if (resolved.ok === false) {
    return null;
  }
  return resolved.sourceText;
}

export async function acceptQuiz(
  quizId: string,
  body: unknown,
  currentUserId: number,
) {
  if (!isValidAnswersPayload(body)) {
    return {
      ok: false as const,
      status: 400,
      error: "invalid answers payload",
    };
  }
  const quizStatus = await quizRepository.selectQuizStatus(quizId);
  if (!quizStatus) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (!isQuizPlayable(quizStatus)) {
    return {
      ok: false as const,
      status: 409,
      error: quizStatus === "generating" ? "quiz is generating" : "quiz is not available",
    };
  }
  const quizState = await quizRepository.selectQuizByIdWithVersion(quizId);
  if (!quizState) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  const internal = quizState.payload;

  const userId = Number(currentUserId);
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  if (user.is_guest) {
    return { ok: false as const, status: 403, error: "signup_required" };
  }

  const acceptedAt = new Date().toISOString();
  const { correctCount, questionCount } = scoreAttempt(internal, body.answers);
  const attemptId = await quizRepository.insertQuizAttempt(
    quizId,
    quizState.version,
    internal,
    userId,
    body.answers,
    acceptedAt,
    correctCount,
    questionCount,
  );
  return { ok: true as const, acceptedAt, attemptId };
}

export async function listQuizzesByCreator(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 400, error: "invalid userId" };
  }
  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false as const, status: 404, error: "user not found" };
  }
  await expireStaleGeneratingQuizzes();
  const rows = await quizRepository.selectQuizzesByCreatedBy(userId);
  const quizzes = rows.map((row) => {
    const tokensRefunded = row.tokens_refunded_at !== null;
    const hasSourceText = Boolean(row.generation_source_text?.trim());
    const hasDocument = Boolean(row.document_id);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      questions: [] as FullQuizDto["questions"],
      createdBy: row.created_by,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      chunkNumber:
        row.chunk_index !== null ? row.chunk_index + 1 : null,
      canRegenerate:
        row.status === "failed" &&
        !tokensRefunded &&
        (hasSourceText || hasDocument),
      canRefundTokens: row.status === "failed" && !tokensRefunded,
      tokensRefunded,
    };
  });
  return { ok: true as const, quizzes };
}

export async function regenerateQuiz(quizId: string, currentUserId: number) {
  const userId = Number(currentUserId);
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const owner = await assertQuizOwner(quizId, userId);
  if (owner.ok === false) {
    return { ok: false as const, status: owner.status, error: owner.error };
  }
  const { context } = owner;
  if (context.status !== "failed") {
    return { ok: false as const, status: 409, error: "quiz is not failed" };
  }
  if (context.tokensRefundedAt) {
    return {
      ok: false as const,
      status: 409,
      error: "cannot regenerate after tokens were refunded",
    };
  }
  const sourceText = await resolveQuizSourceText(context, userId);
  if (!sourceText) {
    return {
      ok: false as const,
      status: 409,
      error: "quiz source text is not available",
    };
  }

  const generationSettings = await getGenerationSettings();
  const finalQuestionCount =
    context.generationQuestionCount ??
    estimateQuestionCount(sourceText, generationSettings);
  const quizLanguage = resolveQuizLanguageOrDefault(context.generationLanguage);

  const reset = await quizRepository.resetQuizForRegeneration(quizId);
  if (!reset) {
    return { ok: false as const, status: 409, error: "quiz is not failed" };
  }

  scheduleQuizGenerationContinue(quizId);

  return {
    ok: true as const,
    quizId,
    status: "generating" as const,
    tokensCharged: 0,
    questionCount: finalQuestionCount,
    language: quizLanguage.code,
    documentId: context.documentId,
    chunkId: context.chunkId,
  };
}

export async function refundQuizGenerationTokens(
  quizId: string,
  currentUserId: number,
) {
  const userId = Number(currentUserId);
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const owner = await assertQuizOwner(quizId, userId);
  if (owner.ok === false) {
    return { ok: false as const, status: owner.status, error: owner.error };
  }
  const { context } = owner;
  if (context.status !== "failed") {
    return { ok: false as const, status: 409, error: "quiz is not failed" };
  }
  if (context.tokensRefundedAt) {
    return { ok: false as const, status: 409, error: "tokens already refunded" };
  }
  if (await tokenRepository.hasQuizGenerationRefund(userId, quizId)) {
    return { ok: false as const, status: 409, error: "tokens already refunded" };
  }

  let refundAmount = context.generationTokensCharged ?? null;
  if (!refundAmount || refundAmount < 1) {
    refundAmount = await tokenRepository.selectQuizGenerationSpendAmount(
      userId,
      quizId,
    );
  }
  if (!refundAmount || refundAmount < 1) {
    return {
      ok: false as const,
      status: 409,
      error: "no tokens to refund for this quiz",
    };
  }

  await tokenRepository.addTokensForUserIdempotent({
    userId,
    amount: refundAmount,
    transactionType: "refund",
    referenceId: quizId,
    idempotencyKey: tokenRepository.quizGenerationRefundIdempotencyKey(quizId),
    metadata: { source: "quiz_generation_refund" },
  });

  await quizRepository.markQuizTokensRefunded(quizId, userId);

  return { ok: true as const, tokensRefunded: refundAmount };
}

export async function getStoredQuizResults(quizId: string, currentUserId: number) {
  const stored = await quizRepository.selectLatestAttemptByQuizId(quizId);
  if (!stored) {
    return {
      ok: false as const,
      status: 404,
      error: "no saved results for this quiz",
    };
  }
  const requesterId = Number(currentUserId);
  if (!Number.isInteger(requesterId) || requesterId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const attemptOwnerId =
    stored.userId === null || stored.userId === undefined
      ? null
      : Number(stored.userId);
  if (
    attemptOwnerId === null ||
    !Number.isInteger(attemptOwnerId) ||
    attemptOwnerId !== requesterId
  ) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  const createdBy = await quizRepository.selectQuizCreatedBy(quizId);
  return {
    ok: true as const,
    quiz: { ...stored.questionSnapshot, createdBy },
    quizVersion: stored.quizVersion,
    answers: stored.answers,
    acceptedAt: stored.acceptedAt,
    score: {
      correct: stored.correctCount,
      total: stored.questionCount,
    },
    attemptId: stored.attemptId,
    userId: stored.userId,
  };
}

export async function getCuttedQuizById(quizId: string) {
  const status = await quizRepository.selectQuizStatus(quizId);
  if (!status) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (!isQuizPlayable(status)) {
    if (status === "failed") {
      const errorMessage = await quizRepository.selectQuizErrorMessage(quizId);
      return {
        ok: false as const,
        status: 409,
        error: errorMessage ?? "quiz generation failed",
      };
    }
    return {
      ok: false as const,
      status: 409,
      error: status === "generating" ? "quiz is generating" : "quiz is not available",
    };
  }
  const quiz = await quizRepository.selectQuizById(quizId);
  if (!quiz) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  return {
    ok: true as const,
    quiz: removePrivateDataFromQuestion(quizId, quiz),
  };
}

export async function getFullQuizById(quizId: string) {
  const status = await quizRepository.selectQuizStatus(quizId);
  if (!status) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (status === "generating") {
    return { ok: false as const, status: 409, error: "quiz is generating" };
  }
  if (status === "failed") {
    const errorMessage = await quizRepository.selectQuizErrorMessage(quizId);
    return {
      ok: false as const,
      status: 409,
      error: errorMessage ?? "quiz generation failed",
    };
  }
  const quiz = await quizRepository.selectQuizById(quizId);
  if (!quiz) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  return { ok: true as const, quiz, status };
}

export async function updateQuiz(
  quizId: string,
  body: { quiz?: unknown },
  currentUserId: number,
) {
  if (!isFullQuizDto(body.quiz)) {
    return { ok: false as const, status: 400, error: "invalid quiz payload" };
  }

  const creatorId = await quizRepository.selectQuizCreatedBy(quizId);
  if (creatorId === null) {
    // If quiz has an author, enforce ownership. For old anonymous quizzes, update is allowed.
  } else {
    const uid = Number(currentUserId);
    if (!Number.isInteger(uid) || uid < 1) {
      return { ok: false as const, status: 401, error: "unauthorized" };
    }
    if (uid !== creatorId) {
      return { ok: false as const, status: 403, error: "forbidden" };
    }
  }

  const version = await quizRepository.updateQuizWithNewVersion(
    quizId,
    body.quiz,
  );
  if (!version) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  await quizRepository.updateQuizStatus(quizId, "published");
  return { ok: true as const, version };
}

export async function deleteQuiz(quizId: string, currentUserId: number) {
  const uid = Number(currentUserId);
  if (!Number.isInteger(uid) || uid < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const outcome = await quizRepository.deleteQuizForUser(quizId, uid);
  if (outcome === "not_found") {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (outcome === "forbidden") {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const };
}

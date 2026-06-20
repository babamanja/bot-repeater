import { randomUUID } from "node:crypto";

import { resolveQuizLanguageOrDefault } from "../config/quizLanguages.js";
import * as documentRepository from "../db/documentRepository.js";
import * as quizRepository from "../db/quizRepository.js";
import * as tokenRepository from "../db/tokenRepository.js";
import * as userRepository from "../db/userRepository.js";
import { isUuid } from "../utils/uuid.js";
import {
  deriveDocumentTitle,
  runDocumentProcessingPipeline,
} from "./documentProcessing.service.js";
import type { QuizCheckAnswerPayloadDto } from "./dto/quizCheckAnswerPayload.dto.js";
import {
  estimateDocumentSummarizationTokens,
  estimateFullUploadGenerationCost,
  estimateTextTokenCount,
  getGenerationSettings,
} from "./generationSettings.service.js";
import { LANDING_DEMO_QUESTION_COUNT } from "./guest.service.js";
import { acceptQuiz } from "./quiz.service.js";
import { isQuizPlayable } from "../types/quizStatus.js";

function isValidAnswersPayload(
  body: unknown,
): body is { answers: QuizCheckAnswerPayloadDto[] } {
  if (!body || typeof body !== "object") {
    return false;
  }
  const answers = (body as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) {
    return false;
  }
  for (const item of answers) {
    if (!item || typeof item !== "object") {
      return false;
    }
    const row = item as { questionId?: unknown; answerIds?: unknown };
    if (typeof row.questionId !== "string" || !isUuid(row.questionId)) {
      return false;
    }
    if (!Array.isArray(row.answerIds)) {
      return false;
    }
    for (const id of row.answerIds) {
      if (typeof id !== "string" || !isUuid(id)) {
        return false;
      }
    }
  }
  return true;
}

type SpendMode = "normal" | "allow_negative";

async function chargeTokens(
  userId: number,
  amount: number,
  referenceId: string,
  metadata: Record<string, unknown>,
  mode: SpendMode,
): Promise<void> {
  if (amount < 1) {
    return;
  }
  if (mode === "allow_negative") {
    await tokenRepository.spendTokensAllowNegative({
      userId,
      amount,
      referenceId,
      metadata,
    });
    return;
  }
  await tokenRepository.spendTokensForUser({
    userId,
    amount,
    referenceId,
    metadata,
  });
}

async function ensureDocumentForLandingQuiz(input: {
  userId: number;
  quizId: string;
  sourceText: string;
  languageCode: string | null;
  spendMode: SpendMode;
}): Promise<
  | { ok: true; documentId: string; chunkId: string | null }
  | { ok: false; status: number; error: string }
> {
  const context = await quizRepository.selectQuizGenerationContext(input.quizId);
  if (!context) {
    return { ok: false, status: 404, error: "quiz not found" };
  }
  if (context.documentId) {
    const chunks = await documentRepository.selectDocumentChunks(context.documentId);
    return {
      ok: true,
      documentId: context.documentId,
      chunkId: context.chunkId ?? chunks[0]?.id ?? null,
    };
  }

  const trimmed = input.sourceText.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "source text is missing" };
  }

  const settings = await getGenerationSettings();
  const summarizationAmount = estimateDocumentSummarizationTokens(trimmed, settings);
  const documentId = randomUUID();
  const title = deriveDocumentTitle(null, trimmed, "text");
  const tokenCount = estimateTextTokenCount(trimmed, settings);
  const summaryLanguage = resolveQuizLanguageOrDefault(input.languageCode ?? undefined);

  try {
    await chargeTokens(
      input.userId,
      summarizationAmount,
      documentId,
      { source: "document_summarization", quizId: input.quizId },
      input.spendMode,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "token deduction failed";
    if (message === "insufficient token balance") {
      return {
        ok: false,
        status: 402,
        error: `INSUFFICIENT_TOKEN_BALANCE:${summarizationAmount}`,
      };
    }
    return { ok: false, status: 500, error: "token deduction failed" };
  }

  await documentRepository.insertDocumentWithContent({
    id: documentId,
    userId: input.userId,
    title,
    sourceType: "text",
    fullText: trimmed,
    tokenCount,
  });

  await runDocumentProcessingPipeline(documentId, {
    languagePromptLabel: summaryLanguage.promptLabel,
  });

  const chunks = await documentRepository.selectDocumentChunks(documentId);
  const firstChunkId = chunks[0]?.id ?? null;
  await quizRepository.updateQuizDocumentLink(
    input.quizId,
    documentId,
    firstChunkId,
  );

  return { ok: true, documentId, chunkId: firstChunkId };
}

export async function claimLandingQuiz(
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

  const quizStatus = await quizRepository.selectQuizStatus(quizId);
  if (!quizStatus) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (!isQuizPlayable(quizStatus)) {
    return {
      ok: false as const,
      status: 409,
      error:
        quizStatus === "generating" ? "quiz is generating" : "quiz is not available",
    };
  }

  const context = await quizRepository.selectQuizGenerationContext(quizId);
  if (!context) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (context.createdBy !== userId) {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  if (!context.generationSourceText?.trim()) {
    return { ok: false as const, status: 400, error: "not a landing quiz" };
  }

  const settings = await getGenerationSettings();
  const questionCount = context.generationQuestionCount ?? LANDING_DEMO_QUESTION_COUNT;
  const sourceText = context.generationSourceText;
  const costs = estimateFullUploadGenerationCost(sourceText, questionCount, settings);
  const quizGenCharged = await tokenRepository.selectQuizGenerationSpendAmount(
    userId,
    quizId,
  );
  const summarizationDue = context.documentId ? 0 : costs.summarizationTokens;
  const quizGenDue = quizGenCharged ? 0 : costs.quizGenerationTokens;
  const totalDue = summarizationDue + quizGenDue;

  const balance = await tokenRepository.selectTokenBalanceByUserId(userId);
  const hasSufficient = balance >= BigInt(totalDue);

  if (!hasSufficient) {
    const documentResult = await ensureDocumentForLandingQuiz({
      userId,
      quizId,
      sourceText,
      languageCode: context.generationLanguage,
      spendMode: "allow_negative",
    });
    if (documentResult.ok === false && documentResult.status !== 402) {
      return { ok: false as const, status: documentResult.status, error: documentResult.error };
    }

    if (quizGenDue > 0) {
      await tokenRepository.spendTokensAllowNegative({
        userId,
        amount: quizGenDue,
        referenceId: quizId,
        metadata: {
          source: "quiz_generation",
          questionCount,
          language: context.generationLanguage,
          landingClaim: true,
        },
      });
    }

    await quizRepository.deleteAttemptsForQuizUser(quizId, userId);
    return {
      ok: false as const,
      status: 402,
      error: "insufficient_tokens",
      redirectTo: "/my-subscription",
    };
  }

  const documentResult = await ensureDocumentForLandingQuiz({
    userId,
    quizId,
    sourceText,
    languageCode: context.generationLanguage,
    spendMode: "normal",
  });
  if (documentResult.ok === false) {
    return {
      ok: false as const,
      status: documentResult.status,
      error: documentResult.error,
    };
  }

  if (quizGenDue > 0) {
    try {
      await tokenRepository.spendTokensForUser({
        userId,
        amount: quizGenDue,
        referenceId: quizId,
        metadata: {
          source: "quiz_generation",
          questionCount,
          language: context.generationLanguage,
          landingClaim: true,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "token deduction failed";
      if (message === "insufficient token balance") {
        await quizRepository.deleteAttemptsForQuizUser(quizId, userId);
        return {
          ok: false as const,
          status: 402,
          error: "insufficient_tokens",
          redirectTo: "/my-subscription",
        };
      }
      return { ok: false as const, status: 500, error: "token deduction failed" };
    }
  }

  return acceptQuiz(quizId, body, userId);
}

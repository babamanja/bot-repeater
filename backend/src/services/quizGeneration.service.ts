import { randomUUID } from "node:crypto";

import * as documentRepository from "../db/documentRepository.js";
import * as quizRepository from "../db/quizRepository.js";
import * as quizGenerationAnalyticsRepository from "../db/quizGenerationAnalyticsRepository.js";
import * as userRepository from "../db/userRepository.js";
import * as tokenRepository from "../db/tokenRepository.js";
import * as documentService from "./document.service.js";
import { buildQuizWithAi } from "./aiQuiz.service.js";
import { resolveQuizLanguageOrDefault } from "../config/quizLanguages.js";
import {
  estimateFullUploadGenerationCost,
  estimateQuestionCount,
  estimateQuizTokensForChunkSourceText,
  estimateTokenCount,
  getGenerationSettings,
  toPublicGenerationSettings,
} from "./generationSettings.service.js";
import { getQuizGenerationTimeoutMs } from "../config/quizGeneration.js";
import { scheduleQuizGenerationContinue } from "./quizGenerationChain.service.js";
import { withTimeout } from "../utils/timeout.js";
import {
  clampGuestSourceText,
  LANDING_DEMO_QUESTION_COUNT,
} from "./guest.service.js";

type QuizGenerationStartInput = {
  sourceText: string;
  documentId?: string | null;
  chunkId?: string | null;
  questionCount?: number;
  language?: unknown;
};

type QuizGenerationFailureAnalytics = {
  userId: number;
  sourceTextLength: number;
  generatedQuestionsCount: number;
  estimatedTokens: number;
  errorMessage: string;
  aiInputTokens?: number | null;
  aiOutputTokens?: number | null;
  aiTotalTokens?: number | null;
  aiModel?: string | null;
};

async function recordQuizGenerationFailure(
  input: QuizGenerationFailureAnalytics,
): Promise<void> {
  await quizGenerationAnalyticsRepository.insertQuizGenerationAnalytics({
    userId: input.userId,
    status: "failed",
    sourceTextLength: input.sourceTextLength,
    generatedQuestionsCount: input.generatedQuestionsCount,
    estimatedTokens: input.estimatedTokens,
    aiInputTokens: input.aiInputTokens ?? null,
    aiOutputTokens: input.aiOutputTokens ?? null,
    aiTotalTokens: input.aiTotalTokens ?? null,
    aiModel: input.aiModel ?? null,
    errorMessage: input.errorMessage,
  });
}

async function failQuizGeneration(
  quizId: string,
  analytics: QuizGenerationFailureAnalytics,
): Promise<void> {
  await quizRepository.failQuizIfGenerating(quizId, analytics.errorMessage);
  await recordQuizGenerationFailure(analytics);
}

function resolveFinalQuestionCount(
  sourceText: string,
  generationSettings: Awaited<ReturnType<typeof getGenerationSettings>>,
  requestedCount: unknown,
): number {
  const estimatedQuestionCount = estimateQuestionCount(sourceText, generationSettings);
  const parsed = Number(requestedCount);
  return Number.isInteger(parsed)
    ? Math.min(
        generationSettings.maxQuestions,
        Math.max(generationSettings.minQuestions, parsed),
      )
    : estimatedQuestionCount;
}

type StartedQuizGeneration = {
  ok: true;
  quizId: string;
  status: "generating";
  tokensCharged: number;
  questionCount: number;
  language: string;
  documentId: string | null;
  chunkId: string | null;
};

type StartedQuizGenerationBatch = StartedQuizGeneration & {
  quizzes: Array<{
    quizId: string;
    chunkId: string;
    tokensCharged: number;
    questionCount: number;
  }>;
  totalTokensCharged: number;
};

async function persistAndScheduleQuizGeneration(input: {
  quizId: string;
  createdByUserId: number;
  sourceText: string;
  finalQuestionCount: number;
  estimatedTokens: number;
  quizLanguage: ReturnType<typeof resolveQuizLanguageOrDefault>;
  documentId?: string | null;
  chunkId?: string | null;
}): Promise<void> {
  await quizRepository.insertPendingQuiz(input.quizId, input.createdByUserId, {
    sourceText: input.sourceText,
    questionCount: input.finalQuestionCount,
    languageCode: input.quizLanguage.code,
    tokensCharged: input.estimatedTokens,
    documentId: input.documentId ?? null,
    chunkId: input.chunkId ?? null,
  });

  scheduleQuizGenerationContinue(input.quizId);
}

async function startQuizGeneration(
  createdByUserId: number,
  input: QuizGenerationStartInput,
): Promise<StartedQuizGeneration | { ok: false; status: number; error: string }> {
  const raw = input.sourceText.trim();
  if (!raw) {
    return { ok: false as const, status: 400, error: "source text is required" };
  }

  const quizLanguage = resolveQuizLanguageOrDefault(input.language);
  const generationSettings = await getGenerationSettings();
  const finalQuestionCount = resolveFinalQuestionCount(
    raw,
    generationSettings,
    input.questionCount,
  );
  const estimatedTokens = input.documentId
    ? estimateQuizTokensForChunkSourceText(raw, finalQuestionCount, generationSettings)
    : estimateTokenCount(raw, finalQuestionCount, generationSettings);

  const quizId = randomUUID();

  try {
    await tokenRepository.spendTokensForUser({
      userId: createdByUserId,
      amount: estimatedTokens,
      referenceId: quizId,
      metadata: {
        source: "quiz_generation",
        questionCount: finalQuestionCount,
        language: quizLanguage.code,
        ...(input.documentId ? { documentId: input.documentId } : {}),
        ...(input.chunkId ? { chunkId: input.chunkId } : {}),
      },
    });
  } catch (error) {
    console.error("[quiz] token deduction failed", { error });
    const message =
      error instanceof Error ? error.message : "token deduction failed";
    if (message === "insufficient token balance") {
      return {
        ok: false as const,
        status: 402,
        error: `INSUFFICIENT_TOKEN_BALANCE:${estimatedTokens}`,
      };
    }
    return { ok: false as const, status: 500, error: "token deduction failed" };
  }

  await persistAndScheduleQuizGeneration({
    quizId,
    createdByUserId,
    sourceText: raw,
    finalQuestionCount,
    estimatedTokens,
    quizLanguage,
    documentId: input.documentId,
    chunkId: input.chunkId,
  });

  return {
    ok: true as const,
    quizId,
    status: "generating" as const,
    tokensCharged: estimatedTokens,
    questionCount: finalQuestionCount,
    language: quizLanguage.code,
    documentId: input.documentId ?? null,
    chunkId: input.chunkId ?? null,
  };
}

async function startQuizGenerationPrepaid(
  createdByUserId: number,
  input: QuizGenerationStartInput & { tokensCharged: number },
): Promise<StartedQuizGeneration | { ok: false; status: number; error: string }> {
  const raw = input.sourceText.trim();
  if (!raw) {
    return { ok: false as const, status: 400, error: "source text is required" };
  }

  const quizLanguage = resolveQuizLanguageOrDefault(input.language);
  const generationSettings = await getGenerationSettings();
  const finalQuestionCount = resolveFinalQuestionCount(
    raw,
    generationSettings,
    input.questionCount,
  );
  const quizId = randomUUID();

  await persistAndScheduleQuizGeneration({
    quizId,
    createdByUserId,
    sourceText: raw,
    finalQuestionCount,
    estimatedTokens: input.tokensCharged,
    quizLanguage,
    documentId: input.documentId,
    chunkId: input.chunkId,
  });

  return {
    ok: true as const,
    quizId,
    status: "generating" as const,
    tokensCharged: input.tokensCharged,
    questionCount: finalQuestionCount,
    language: quizLanguage.code,
    documentId: input.documentId ?? null,
    chunkId: input.chunkId ?? null,
  };
}

async function generateQuizzesForAllDocumentChunks(
  documentId: string,
  createdByUserId: number,
  options?: { questionCount?: number; language?: unknown },
): Promise<
  StartedQuizGenerationBatch | { ok: false; status: number; error: string }
> {
  const resolved = await documentService.resolveDocumentChunksForGeneration(
    documentId,
    createdByUserId,
  );
  if (resolved.ok === false) {
    return resolved;
  }

  const generationSettings = await getGenerationSettings();
  const quizLanguage = resolveQuizLanguageOrDefault(options?.language);
  const plans = resolved.chunks.map(({ chunk, sourceText }) => {
    const finalQuestionCount = resolveFinalQuestionCount(
      sourceText,
      generationSettings,
      options?.questionCount,
    );
    const tokens = estimateQuizTokensForChunkSourceText(
      sourceText,
      finalQuestionCount,
      generationSettings,
    );
    return { chunk, sourceText, finalQuestionCount, tokens };
  });
  const totalTokens = plans.reduce((sum, plan) => sum + plan.tokens, 0);
  const batchId = randomUUID();

  try {
    await tokenRepository.spendTokensForUser({
      userId: createdByUserId,
      amount: totalTokens,
      referenceId: batchId,
      metadata: {
        source: "document_quiz_generation",
        documentId,
        chunkCount: plans.length,
        chunkIds: plans.map((plan) => plan.chunk.id),
        questionCount: plans[0]?.finalQuestionCount,
        language: quizLanguage.code,
      },
    });
  } catch (error) {
    console.error("[quiz] batch token deduction failed", { error });
    const message =
      error instanceof Error ? error.message : "token deduction failed";
    if (message === "insufficient token balance") {
      return {
        ok: false as const,
        status: 402,
        error: `INSUFFICIENT_TOKEN_BALANCE:${totalTokens}`,
      };
    }
    return { ok: false as const, status: 500, error: "token deduction failed" };
  }

  const startedQuizzes: StartedQuizGenerationBatch["quizzes"] = [];
  for (const plan of plans) {
    const started = await startQuizGenerationPrepaid(createdByUserId, {
      sourceText: plan.sourceText,
      documentId: resolved.document.id,
      chunkId: plan.chunk.id,
      questionCount: plan.finalQuestionCount,
      language: options?.language,
      tokensCharged: plan.tokens,
    });
    if (started.ok === false) {
      return started;
    }
    startedQuizzes.push({
      quizId: started.quizId,
      chunkId: plan.chunk.id,
      tokensCharged: plan.tokens,
      questionCount: plan.finalQuestionCount,
    });
  }

  const first = startedQuizzes[0];
  if (!first) {
    return { ok: false as const, status: 500, error: "quiz generation failed" };
  }

  return {
    ok: true as const,
    quizId: first.quizId,
    status: "generating" as const,
    tokensCharged: totalTokens,
    totalTokensCharged: totalTokens,
    questionCount: first.questionCount,
    language: quizLanguage.code,
    documentId: resolved.document.id,
    chunkId: null,
    quizzes: startedQuizzes,
  };
}

export async function processQuizGenerationInternal(
  quizId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const context = await quizRepository.selectQuizGenerationContext(quizId);
  if (!context) {
    return { ok: false as const, status: 404, error: "quiz not found" };
  }
  if (context.status !== "generating") {
    return { ok: true as const };
  }

  const text = context.generationSourceText?.trim() ?? "";
  const createdByUserId = context.createdBy;
  const finalQuestionCount = context.generationQuestionCount;
  const estimatedTokens = context.generationTokensCharged ?? 0;

  if (!text || !Number.isInteger(createdByUserId) || createdByUserId! < 1) {
    const errorMessage = "quiz generation context is invalid";
    if (Number.isInteger(createdByUserId) && createdByUserId! >= 1) {
      await failQuizGeneration(quizId, {
        userId: createdByUserId!,
        sourceTextLength: text.length,
        generatedQuestionsCount: finalQuestionCount ?? 0,
        estimatedTokens,
        errorMessage,
      });
    } else {
      await quizRepository.failQuizIfGenerating(quizId, errorMessage);
    }
    return { ok: false as const, status: 422, error: errorMessage };
  }

  const quizLanguage = resolveQuizLanguageOrDefault(context.generationLanguage);
  const questionCount =
    Number.isInteger(finalQuestionCount) && finalQuestionCount! > 0
      ? finalQuestionCount!
      : estimateQuestionCount(text, await getGenerationSettings());

  const failureBase: Omit<QuizGenerationFailureAnalytics, "errorMessage"> = {
    userId: createdByUserId!,
    sourceTextLength: text.length,
    generatedQuestionsCount: questionCount,
    estimatedTokens,
  };

  console.log("[quiz-generation] job.start", {
    quizId,
    userId: createdByUserId,
    questionCount,
    sourceTextLength: text.length,
  });

  let aiResult: Awaited<ReturnType<typeof buildQuizWithAi>>;
  try {
    aiResult = await withTimeout(
      buildQuizWithAi(text, quizLanguage.promptLabel, questionCount),
      getQuizGenerationTimeoutMs(),
      "quiz generation timed out",
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "quiz generation failed";
    await failQuizGeneration(quizId, {
      ...failureBase,
      errorMessage,
    });
    return { ok: false as const, status: 500, error: errorMessage };
  }

  if (aiResult.ok === false) {
    await failQuizGeneration(quizId, {
      ...failureBase,
      errorMessage: aiResult.error,
      aiInputTokens: aiResult.usage.inputTokens,
      aiOutputTokens: aiResult.usage.outputTokens,
      aiTotalTokens: aiResult.usage.totalTokens,
      aiModel: aiResult.model,
    });
    return { ok: false as const, status: 502, error: aiResult.error };
  }

  const saved = await quizRepository.insertQuizVersionIfGenerating(
    quizId,
    aiResult.quiz,
    "published",
  );
  if (!saved) {
    return { ok: true as const };
  }

  await quizGenerationAnalyticsRepository.insertQuizGenerationAnalytics({
    userId: createdByUserId!,
    status: "success",
    sourceTextLength: text.length,
    generatedQuestionsCount: aiResult.quiz.questions.length,
    estimatedTokens,
    aiInputTokens: aiResult.usage.inputTokens,
    aiOutputTokens: aiResult.usage.outputTokens,
    aiTotalTokens: aiResult.usage.totalTokens,
    aiModel: aiResult.model,
    errorMessage: null,
  });

  if (context.chunkId) {
    await documentRepository.updateChunkStatusAfterQuizGenerated(context.chunkId);
  }

  console.log("[quiz-generation] job.done", {
    quizId,
    questionCount: aiResult.quiz.questions.length,
  });
  return { ok: true as const };
}

export async function generateQuiz(
  text: string,
  currentUserId: number,
  options?: { questionCount?: number; language?: unknown },
) {
  const rawInput = typeof text === "string" ? text : "";
  if (!rawInput.trim()) {
    return { ok: false as const, status: 400, error: "text is required" };
  }

  const createdByUserId = Number(currentUserId);
  if (!Number.isInteger(createdByUserId) || createdByUserId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(createdByUserId);
  if (!user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const guest = user.is_guest;
  const raw = clampGuestSourceText(rawInput, guest);
  const questionCount = guest ? LANDING_DEMO_QUESTION_COUNT : options?.questionCount;

  return startQuizGeneration(createdByUserId, {
    sourceText: raw,
    questionCount,
    language: options?.language,
  });
}

export async function generateQuizFromDocument(
  documentId: string,
  currentUserId: number,
  options?: {
    chunkId?: unknown;
    questionCount?: number;
    language?: unknown;
  },
) {
  const createdByUserId = Number(currentUserId);
  if (!Number.isInteger(createdByUserId) || createdByUserId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(createdByUserId);
  if (!user) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const chunkId = options?.chunkId;
  const hasChunkId =
    chunkId !== undefined && chunkId !== null && chunkId !== "";

  if (!hasChunkId) {
    return generateQuizzesForAllDocumentChunks(
      documentId,
      createdByUserId,
      options,
    );
  }

  const resolved = await documentService.resolveDocumentChunkForGeneration(
    documentId,
    createdByUserId,
    chunkId,
  );
  if (resolved.ok === false) {
    return {
      ok: false as const,
      status: resolved.status,
      error: resolved.error,
    };
  }

  return startQuizGeneration(createdByUserId, {
    sourceText: resolved.sourceText,
    documentId: resolved.document.id,
    chunkId: resolved.chunk.id,
    questionCount: options?.questionCount,
    language: options?.language,
  });
}

export async function getQuizGenerationSettingsPreview(
  text: string,
  options?: { questionCount?: unknown },
) {
  const safeText = typeof text === "string" ? text : "";
  const settings = await getGenerationSettings();
  const estimatedQuestions = estimateQuestionCount(safeText, settings);
  const requestedCount = Number(options?.questionCount);
  const questionCount = Number.isInteger(requestedCount)
    ? Math.min(
        settings.maxQuestions,
        Math.max(settings.minQuestions, requestedCount),
      )
    : estimatedQuestions;

  const costs = safeText.trim()
    ? estimateFullUploadGenerationCost(safeText, questionCount, settings)
    : {
        summarizationTokens: 0,
        quizGenerationTokens: estimateTokenCount("", questionCount, settings),
        totalEstimatedTokens: estimateTokenCount("", questionCount, settings),
      };

  return {
    ok: true as const,
    settings: toPublicGenerationSettings(settings),
    estimatedTokens: costs.quizGenerationTokens,
    summarizationTokens: costs.summarizationTokens,
    quizGenerationTokens: costs.quizGenerationTokens,
    totalEstimatedTokens: costs.totalEstimatedTokens,
    estimatedQuestions: questionCount,
  };
}

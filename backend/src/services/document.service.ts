import { randomUUID } from "node:crypto";
import { resolveQuizLanguageOrDefault } from "../config/quizLanguages.js";
import * as documentRepository from "../db/documentRepository.js";
import * as tokenRepository from "../db/tokenRepository.js";
import * as userRepository from "../db/userRepository.js";
import {
  deriveDocumentTitle,
  resolveSourceType,
  runDocumentProcessingPipeline,
} from "./documentProcessing.service.js";
import {
  estimateChunkSummaryTokenCount,
  estimateDocumentChunkCount,
  estimateDocumentSummarizationTokens,
  estimateQuestionCount,
  estimateQuizTokensForChunkSourceText,
  estimateTextTokenCount,
  estimateTokenCount,
  getGenerationSettings,
  toPublicGenerationSettings,
} from "./generationSettings.service.js";
import {
  getEffectivePlanCodeForUser,
  getUploadMaxTextCharsForUser,
} from "./subscriptionPlan.service.js";
import { isUuid } from "../utils/uuid.js";

function toPublicDocument(row: documentRepository.DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    sourceType: row.source_type,
    tokenCount: row.token_count,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toPublicChunk(row: documentRepository.DocumentChunkRow) {
  return {
    id: row.id,
    chunkIndex: row.chunk_index,
    title: row.title,
    tokenCount: row.token_count,
    status: row.status,
    summary: row.summary,
    errorMessage: row.error_message,
  };
}

async function chargeDocumentSummarization(
  userId: number,
  documentId: string,
  fullText: string,
  settings: Awaited<ReturnType<typeof getGenerationSettings>>,
): Promise<
  | { ok: true; amount: number }
  | { ok: false; status: number; error: string }
> {
  const amount = estimateDocumentSummarizationTokens(fullText, settings);
  if (amount < 1) {
    return { ok: true, amount: 0 };
  }
  try {
    await tokenRepository.spendTokensForUser({
      userId,
      amount,
      referenceId: documentId,
      metadata: {
        source: "document_summarization",
        chunkCount: estimateDocumentChunkCount(fullText, settings),
      },
    });
    return { ok: true, amount };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "token deduction failed";
    if (message === "insufficient token balance") {
      return {
        ok: false,
        status: 402,
        error: `INSUFFICIENT_TOKEN_BALANCE:${amount}`,
      };
    }
    return { ok: false, status: 500, error: "token deduction failed" };
  }
}

async function refundDocumentSummarization(
  userId: number,
  documentId: string,
  amount: number,
  reason: string,
): Promise<void> {
  if (amount < 1) {
    return;
  }
  await tokenRepository.addTokensForUserIdempotent({
    userId,
    amount,
    transactionType: "refund",
    referenceId: documentId,
    idempotencyKey: tokenRepository.documentSummarizationRefundIdempotencyKey(
      documentId,
      reason,
    ),
    metadata: { source: "document_summarization_refund", reason },
  });
}

export async function createDocument(
  userId: number,
  body: unknown,
): Promise<
  | {
      ok: true;
      document: ReturnType<typeof toPublicDocument>;
      chunks: ReturnType<typeof toPublicChunk>[];
      tokensChargedSummarization: number;
    }
  | { ok: false; status: number; error: string }
> {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const user = await userRepository.selectUserById(userId);
  if (!user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const fullText = typeof obj.fullText === "string" ? obj.fullText : "";
  const trimmed = fullText.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "fullText is required" };
  }
  const maxTextChars = await getUploadMaxTextCharsForUser(userId);
  if (trimmed.length > maxTextChars) {
    return {
      ok: false,
      status: 413,
      error: `TEXT_TOO_LONG:${maxTextChars}`,
    };
  }

  const sourceType = resolveSourceType(obj.sourceType);
  if (!sourceType) {
    return { ok: false, status: 400, error: "sourceType must be pdf, docx, or text" };
  }

  const saveOnly = obj.saveOnly === true;
  if (saveOnly) {
    const planCode = await getEffectivePlanCodeForUser(userId);
    if (planCode !== "premium") {
      return { ok: false, status: 403, error: "premium_required" };
    }
  }

  const settings = await getGenerationSettings();
  const documentId = randomUUID();
  const title = deriveDocumentTitle(obj.title, trimmed, sourceType);
  const tokenCount = estimateTextTokenCount(trimmed, settings);

  const charge = await chargeDocumentSummarization(
    userId,
    documentId,
    trimmed,
    settings,
  );
  if (charge.ok === false) {
    return charge;
  }

  let summarizationCharged = charge.amount;

  try {
    const document = await documentRepository.insertDocumentWithContent({
      id: documentId,
      userId,
      title,
      sourceType,
      fullText: trimmed,
      tokenCount,
    });

    const summaryLanguage = resolveQuizLanguageOrDefault(obj.language);
    await runDocumentProcessingPipeline(documentId, {
      languagePromptLabel: summaryLanguage.promptLabel,
    });

    const refreshed = await documentRepository.selectDocumentByIdForUser(
      documentId,
      userId,
    );
    const chunks = await documentRepository.selectDocumentChunks(documentId);
    const perChunkSummaryTokens = estimateChunkSummaryTokenCount(settings);

    if ((refreshed ?? document).status === "failed") {
      if (summarizationCharged > 0) {
        await refundDocumentSummarization(
          userId,
          documentId,
          summarizationCharged,
          "pipeline-failed",
        );
        summarizationCharged = 0;
      }
    } else {
      const failedChunks = chunks.filter((chunk) => chunk.status === "failed").length;
      if (failedChunks > 0) {
        const refundAmount = failedChunks * perChunkSummaryTokens;
        const appliedRefund = Math.min(summarizationCharged, refundAmount);
        if (appliedRefund > 0) {
          await refundDocumentSummarization(
            userId,
            documentId,
            appliedRefund,
            `partial-failed-chunks-${failedChunks}`,
          );
          summarizationCharged -= appliedRefund;
        }
      }
    }

    return {
      ok: true,
      document: toPublicDocument(refreshed ?? document),
      chunks: chunks.map(toPublicChunk),
      tokensChargedSummarization: summarizationCharged,
    };
  } catch (error) {
    if (summarizationCharged > 0) {
      await refundDocumentSummarization(
        userId,
        documentId,
        summarizationCharged,
        "pipeline-error",
      );
    }
    const message =
      error instanceof Error ? error.message : "document creation failed";
    return { ok: false, status: 500, error: message };
  }
}

export async function listDocuments(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }
  const rows = await documentRepository.selectDocumentsByUserId(userId);
  return {
    ok: true as const,
    documents: rows.map((row) => ({
      ...toPublicDocument(row),
      chunkCount: row.chunk_count,
    })),
  };
}

export async function getDocumentById(documentId: string, userId: number) {
  if (!isUuid(documentId)) {
    return { ok: false as const, status: 400, error: "invalid documentId" };
  }
  const detail = await documentRepository.selectDocumentDetail(documentId, userId);
  if (!detail) {
    return { ok: false as const, status: 404, error: "document not found" };
  }
  return {
    ok: true as const,
    document: toPublicDocument(detail.document),
    chunks: detail.chunks.map((chunk) => ({
      id: chunk.id,
      chunkIndex: chunk.chunk_index,
      title: chunk.title,
      tokenCount: chunk.token_count,
      status: chunk.status,
      summary: chunk.summary,
      errorMessage: chunk.error_message,
    })),
  };
}

function resolveQuestionCountForGeneration(
  sourceText: string,
  settings: Awaited<ReturnType<typeof getGenerationSettings>>,
  requestedCount: unknown,
): number {
  const estimatedQuestions = estimateQuestionCount(sourceText, settings);
  const parsed = Number(requestedCount);
  return Number.isInteger(parsed)
    ? Math.min(
        settings.maxQuestions,
        Math.max(settings.minQuestions, parsed),
      )
    : estimatedQuestions;
}

export async function getDocumentGenerationPreview(
  documentId: string,
  userId: number,
  chunkId: unknown,
  options?: { questionCount?: unknown },
) {
  const settings = await getGenerationSettings();
  const hasChunkId =
    chunkId !== undefined && chunkId !== null && chunkId !== "";

  if (hasChunkId) {
    const resolved = await resolveDocumentChunkForGeneration(
      documentId,
      userId,
      chunkId,
    );
    if (resolved.ok === false) {
      return resolved;
    }
    const questionCount = resolveQuestionCountForGeneration(
      resolved.sourceText,
      settings,
      options?.questionCount,
    );
    return {
      ok: true as const,
      documentId: resolved.document.id,
      chunkId: resolved.chunk.id,
      chunkCount: 1,
      settings: toPublicGenerationSettings(settings),
      estimatedTokens: estimateQuizTokensForChunkSourceText(
        resolved.sourceText,
        questionCount,
        settings,
      ),
      estimatedQuestions: questionCount,
    };
  }

  const resolved = await resolveDocumentChunksForGeneration(documentId, userId);
  if (resolved.ok === false) {
    return resolved;
  }

  const firstSource = resolved.chunks[0]?.sourceText ?? "";
  const questionCount = resolveQuestionCountForGeneration(
    firstSource,
    settings,
    options?.questionCount,
  );
  const estimatedTokens = resolved.chunks.reduce(
    (sum, entry) =>
      sum +
      estimateQuizTokensForChunkSourceText(
        entry.sourceText,
        questionCount,
        settings,
      ),
    0,
  );

  return {
    ok: true as const,
    documentId: resolved.document.id,
    chunkId: null,
    chunkCount: resolved.chunks.length,
    settings: toPublicGenerationSettings(settings),
    estimatedTokens: Math.max(1, estimatedTokens),
    estimatedQuestions: questionCount,
  };
}

export async function resolveDocumentChunksForGeneration(
  documentId: string,
  userId: number,
): Promise<
  | {
      ok: true;
      document: documentRepository.DocumentRow;
      chunks: Array<{
        chunk: documentRepository.DocumentChunkRow;
        sourceText: string;
      }>;
    }
  | { ok: false; status: number; error: string }
> {
  if (!isUuid(documentId)) {
    return { ok: false, status: 400, error: "invalid documentId" };
  }

  const document = await documentRepository.selectDocumentByIdForUser(
    documentId,
    userId,
  );
  if (!document) {
    return { ok: false, status: 404, error: "document not found" };
  }
  if (document.status === "failed") {
    return { ok: false, status: 409, error: "document processing failed" };
  }
  if (document.status !== "summarized") {
    return { ok: false, status: 409, error: "document is not ready" };
  }

  const rows = await documentRepository.selectDocumentChunks(documentId);
  const chunks = rows
    .filter((chunk) => chunk.status !== "failed")
    .map((chunk) => ({
      chunk,
      sourceText: (chunk.summary ?? chunk.text).trim(),
    }))
    .filter((entry) => entry.sourceText.length > 0);

  if (chunks.length === 0) {
    return { ok: false, status: 409, error: "no chunks ready for quiz generation" };
  }

  return { ok: true, document, chunks };
}

export async function resolveDocumentChunkForGeneration(
  documentId: string,
  userId: number,
  chunkId: unknown,
): Promise<
  | {
      ok: true;
      document: documentRepository.DocumentRow;
      chunk: documentRepository.DocumentChunkRow;
      sourceText: string;
    }
  | { ok: false; status: number; error: string }
> {
  if (!isUuid(documentId)) {
    return { ok: false, status: 400, error: "invalid documentId" };
  }

  const document = await documentRepository.selectDocumentByIdForUser(
    documentId,
    userId,
  );
  if (!document) {
    return { ok: false, status: 404, error: "document not found" };
  }
  if (document.status === "failed") {
    return { ok: false, status: 409, error: "document processing failed" };
  }
  if (document.status !== "summarized") {
    return { ok: false, status: 409, error: "document is not ready" };
  }

  const chunks = await documentRepository.selectDocumentChunks(documentId);
  if (chunks.length === 0) {
    return { ok: false, status: 409, error: "document has no chunks" };
  }

  let chunk: documentRepository.DocumentChunkRow | undefined;
  if (chunkId === undefined || chunkId === null || chunkId === "") {
    if (chunks.length !== 1) {
      return {
        ok: false,
        status: 400,
        error: "chunkId is required when document has multiple chunks",
      };
    }
    chunk = chunks[0];
  } else {
    if (typeof chunkId !== "string" || !isUuid(chunkId)) {
      return { ok: false, status: 400, error: "invalid chunkId" };
    }
    chunk = chunks.find((row) => row.id === chunkId);
    if (!chunk) {
      return { ok: false, status: 404, error: "chunk not found" };
    }
  }

  if (chunk.status === "failed") {
    return { ok: false, status: 409, error: "chunk processing failed" };
  }

  const sourceText = (chunk.summary ?? chunk.text).trim();
  if (!sourceText) {
    return { ok: false, status: 409, error: "chunk has no text" };
  }

  return { ok: true, document, chunk, sourceText };
}

export async function deleteDocument(documentId: string, userId: number) {
  if (!isUuid(documentId)) {
    return { ok: false as const, status: 400, error: "invalid documentId" };
  }
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const outcome = await documentRepository.deleteDocumentForUser(
    documentId,
    userId,
  );
  if (outcome === "not_found") {
    return { ok: false as const, status: 404, error: "document not found" };
  }
  if (outcome === "forbidden") {
    return { ok: false as const, status: 403, error: "forbidden" };
  }
  return { ok: true as const };
}

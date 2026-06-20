import { randomUUID } from "node:crypto";
import type { DocumentChunkStatus, DocumentSourceType } from "@prisma/client";
import * as documentRepository from "../db/documentRepository.js";
import {
  estimateChunkSummaryTokenCount,
  getGenerationSettings,
} from "./generationSettings.service.js";
import { splitTextIntoChunks } from "../utils/textChunking.js";
import { summarizeChunkWithAi } from "./aiChunkSummary.service.js";

type ProcessedChunk = {
  id: string;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  title: string | null;
  summary: string | null;
  status: DocumentChunkStatus;
  errorMessage: string | null;
  aiInputTokens: number | null;
  aiOutputTokens: number | null;
  aiTotalTokens: number | null;
  aiModel: string | null;
};

async function summarizeChunkText(
  text: string,
  languagePromptLabel: string,
  chunkIndex: number,
): Promise<
  | {
      title: string;
      summary: string;
      aiInputTokens: number | null;
      aiOutputTokens: number | null;
      aiTotalTokens: number | null;
      aiModel: string | null;
    }
  | { error: string; aiModel: string | null }
> {
  const result = await summarizeChunkWithAi(text, {
    language: languagePromptLabel,
    chunkIndex,
  });
  if (result.ok === false) {
    return { error: result.error, aiModel: result.model };
  }
  return {
    title: result.title,
    summary: result.summary,
    aiInputTokens: result.usage.inputTokens,
    aiOutputTokens: result.usage.outputTokens,
    aiTotalTokens: result.usage.totalTokens,
    aiModel: result.model,
  };
}

export async function runDocumentProcessingPipeline(
  documentId: string,
  options?: { languagePromptLabel?: string },
): Promise<void> {
  const languagePromptLabel =
    options?.languagePromptLabel?.trim() || "the same language as the source text";
  const fullText = await documentRepository.selectDocumentContent(documentId);
  if (fullText === null) {
    await documentRepository.markDocumentFailed(documentId, "document content is missing");
    return;
  }

  const trimmed = fullText.trim();
  if (!trimmed) {
    await documentRepository.markDocumentFailed(documentId, "document text is empty");
    return;
  }

  try {
    const settings = await getGenerationSettings();
    const pieces = splitTextIntoChunks(
      trimmed,
      settings.chunkSizeChars,
      settings.chunkOverlapChars,
    );
    const chunkSummaryTokens = estimateChunkSummaryTokenCount(settings);
    if (pieces.length === 0) {
      await documentRepository.markDocumentFailed(documentId, "document text is empty");
      return;
    }

    await documentRepository.updateDocumentStatus(documentId, "chunked");

    const processed: ProcessedChunk[] = [];
    for (const [chunkIndex, text] of pieces.entries()) {
      const summaryResult = await summarizeChunkText(
        text,
        languagePromptLabel,
        chunkIndex,
      );
      if ("error" in summaryResult) {
        processed.push({
          id: randomUUID(),
          chunkIndex,
          text,
          tokenCount: chunkSummaryTokens,
          title: null,
          summary: null,
          status: "failed",
          errorMessage: summaryResult.error,
          aiInputTokens: null,
          aiOutputTokens: null,
          aiTotalTokens: null,
          aiModel: summaryResult.aiModel,
        });
        continue;
      }

      processed.push({
        id: randomUUID(),
        chunkIndex,
        text,
        tokenCount: chunkSummaryTokens,
        title: summaryResult.title,
        summary: summaryResult.summary,
        status: "summarized",
        errorMessage: null,
        aiInputTokens: summaryResult.aiInputTokens,
        aiOutputTokens: summaryResult.aiOutputTokens,
        aiTotalTokens: summaryResult.aiTotalTokens,
        aiModel: summaryResult.aiModel,
      });
    }

    const readyCount = processed.filter((chunk) => chunk.status === "summarized").length;
    if (readyCount === 0) {
      const firstError =
        processed.find((chunk) => chunk.errorMessage)?.errorMessage ??
        "chunk summarization failed";
      await documentRepository.replaceDocumentChunks(documentId, processed);
      await documentRepository.updateDocumentStatus(documentId, "failed", {
        errorMessage: firstError,
      });
      return;
    }

    await documentRepository.replaceDocumentChunks(documentId, processed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "document processing failed";
    await documentRepository.markDocumentFailed(documentId, message);
  }
}

export function resolveSourceType(input: unknown): DocumentSourceType | null {
  if (input === "pdf" || input === "docx" || input === "text") {
    return input;
  }
  return null;
}

export function deriveDocumentTitle(
  title: unknown,
  fullText: string,
  sourceType: DocumentSourceType,
): string {
  if (typeof title === "string" && title.trim()) {
    return title.trim().slice(0, 200);
  }
  const firstLine = fullText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine) {
    return firstLine.slice(0, 200);
  }
  if (sourceType === "pdf") {
    return "PDF document";
  }
  if (sourceType === "docx") {
    return "Word document";
  }
  return "Pasted text";
}

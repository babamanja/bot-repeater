import * as adminRepository from "../db/adminRepository.js";
import { getDocumentSummaryMaxChars } from "../config/documentProcessing.js";
import { splitTextIntoChunks } from "../utils/textChunking.js";

export type GenerationSettings = {
  tokensPerChar: number;
  tokensPerQuestion: number;
  questionsPerChunk: number;
  minQuestions: number;
  maxQuestions: number;
  defaultQuestions: number;
  /** Max characters per document chunk before splitting. */
  chunkSizeChars: number;
  /** Overlap in characters between consecutive chunks. */
  chunkOverlapChars: number;
  /** Estimated tokens charged per chunk AI summarization. */
  tokensPerChunkSummary: number;
  /** Tokens charged for OCR on one uploaded photo. */
  tokensPerOcrImage: number;
  /** Free tokens granted once on new user signup (password or Google). */
  signupBonusTokens: number;
};

const SETTINGS_KEY = "quiz_generation";

const MIN_CHUNK_SIZE_CHARS = 2_000;
const MAX_CHUNK_SIZE_CHARS = 100_000;
const MAX_CHUNK_OVERLAP_CHARS = 10_000;

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  tokensPerChar: 0.25,
  tokensPerQuestion: 100,
  questionsPerChunk: 8,
  minQuestions: 3,
  maxQuestions: 20,
  defaultQuestions: 10,
  chunkSizeChars: 12_000,
  chunkOverlapChars: 0,
  tokensPerChunkSummary: 50,
  tokensPerOcrImage: 10,
  signupBonusTokens: 30,
};

function toPositiveNumber(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0) {
    return null;
  }
  return input;
}

function toPositiveInteger(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isInteger(input) || input <= 0) {
    return null;
  }
  return input;
}

function toNonNegativeInteger(input: unknown): number | null {
  if (typeof input !== "number" || !Number.isInteger(input) || input < 0) {
    return null;
  }
  return input;
}

export function sanitizeGenerationSettings(input: unknown): GenerationSettings {
  const obj =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const tokensPerChar =
    toPositiveNumber(obj.tokensPerChar) ??
    DEFAULT_GENERATION_SETTINGS.tokensPerChar;
  const tokensPerQuestion =
    toPositiveNumber(obj.tokensPerQuestion) ??
    DEFAULT_GENERATION_SETTINGS.tokensPerQuestion;
  const questionsPerChunk =
    toPositiveNumber(obj.questionsPerChunk) ??
    toPositiveNumber(obj.questionsPer1000Chars) ??
    DEFAULT_GENERATION_SETTINGS.questionsPerChunk;
  const minQuestions =
    toPositiveInteger(obj.minQuestions) ??
    DEFAULT_GENERATION_SETTINGS.minQuestions;
  const maxQuestions =
    toPositiveInteger(obj.maxQuestions) ??
    DEFAULT_GENERATION_SETTINGS.maxQuestions;
  const defaultQuestions =
    toPositiveInteger(obj.defaultQuestions) ??
    DEFAULT_GENERATION_SETTINGS.defaultQuestions;
  const chunkSizeCharsRaw =
    toPositiveInteger(obj.chunkSizeChars) ??
    DEFAULT_GENERATION_SETTINGS.chunkSizeChars;
  const chunkSizeChars = Math.min(
    MAX_CHUNK_SIZE_CHARS,
    Math.max(MIN_CHUNK_SIZE_CHARS, chunkSizeCharsRaw),
  );
  const chunkOverlapCharsRaw =
    toNonNegativeInteger(obj.chunkOverlapChars) ??
    DEFAULT_GENERATION_SETTINGS.chunkOverlapChars;
  const chunkOverlapChars = Math.min(
    Math.max(0, chunkOverlapCharsRaw),
    Math.min(MAX_CHUNK_OVERLAP_CHARS, chunkSizeChars - 1),
  );
  const tokensPerChunkSummary =
    toPositiveNumber(obj.tokensPerChunkSummary) ??
    DEFAULT_GENERATION_SETTINGS.tokensPerChunkSummary;
  const tokensPerOcrImage =
    toPositiveNumber(obj.tokensPerOcrImage) ??
    DEFAULT_GENERATION_SETTINGS.tokensPerOcrImage;
  const signupBonusTokens =
    toNonNegativeInteger(obj.signupBonusTokens) ??
    DEFAULT_GENERATION_SETTINGS.signupBonusTokens;

  const normalizedMax = Math.max(maxQuestions, minQuestions);
  const normalizedDefault = Math.min(
    Math.max(defaultQuestions, minQuestions),
    normalizedMax,
  );

  return {
    tokensPerChar,
    tokensPerQuestion,
    questionsPerChunk,
    minQuestions,
    maxQuestions: normalizedMax,
    defaultQuestions: normalizedDefault,
    chunkSizeChars,
    chunkOverlapChars,
    tokensPerChunkSummary,
    tokensPerOcrImage,
    signupBonusTokens,
  };
}

export function estimateOcrImageTokenCost(settings: GenerationSettings): number {
  return Math.max(1, Math.floor(settings.tokensPerOcrImage));
}

export function estimatePdfOcrTokenCost(
  pagesNeedingOcr: number,
  settings: GenerationSettings,
): number {
  if (pagesNeedingOcr < 1) {
    return 0;
  }
  return pagesNeedingOcr * estimateOcrImageTokenCost(settings);
}

/** Settings exposed to quiz UI (excludes admin-only config). */
export function toPublicGenerationSettings(
  settings: GenerationSettings,
): Omit<GenerationSettings, "signupBonusTokens"> {
  const { signupBonusTokens: _signupBonusTokens, ...publicSettings } = settings;
  return publicSettings;
}

export function estimateDocumentChunkCount(
  text: string,
  settings: Pick<GenerationSettings, "chunkSizeChars" | "chunkOverlapChars">,
): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return splitTextIntoChunks(
    trimmed,
    settings.chunkSizeChars,
    settings.chunkOverlapChars,
  ).length;
}

export function estimateChunkSummaryTokenCount(settings: GenerationSettings): number {
  return Math.max(1, Math.floor(settings.tokensPerChunkSummary));
}

/** Tokens charged upfront when creating a document (all chunks). */
export function estimateDocumentSummarizationTokens(
  text: string,
  settings: GenerationSettings,
): number {
  const chunkCount = estimateDocumentChunkCount(text, settings);
  if (chunkCount === 0) {
    return 0;
  }
  return chunkCount * estimateChunkSummaryTokenCount(settings);
}

/** Quiz source text for a document chunk (summary length capped). */
export function capChunkTextForQuizEstimate(chunkText: string): string {
  return chunkText.trim().slice(0, getDocumentSummaryMaxChars()).trim();
}

/** Quiz generation estimate for all document chunks (matches batch quiz billing). */
export function estimateAllChunksQuizTokens(
  text: string,
  questionCount: number,
  settings: GenerationSettings,
): number {
  const trimmed = text.trim();
  if (!trimmed) {
    const q =
      Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 0;
    return Math.max(1, Math.floor(q * settings.tokensPerQuestion));
  }
  const pieces = splitTextIntoChunks(
    trimmed,
    settings.chunkSizeChars,
    settings.chunkOverlapChars,
  );
  let total = 0;
  for (const piece of pieces) {
    const sourceText = capChunkTextForQuizEstimate(piece);
    if (sourceText) {
      total += estimateTokenCount(sourceText, questionCount, settings);
    }
  }
  return Math.max(1, total);
}

export function estimateQuizTokensForChunkSourceText(
  sourceText: string,
  questionCount: number,
  settings: GenerationSettings,
): number {
  const capped = capChunkTextForQuizEstimate(sourceText);
  if (!capped) {
    const q =
      Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 0;
    return Math.max(1, Math.floor(q * settings.tokensPerQuestion));
  }
  return estimateTokenCount(capped, questionCount, settings);
}

export function estimateFullUploadGenerationCost(
  text: string,
  questionCount: number,
  settings: GenerationSettings,
): {
  summarizationTokens: number;
  quizGenerationTokens: number;
  totalEstimatedTokens: number;
} {
  const summarizationTokens = estimateDocumentSummarizationTokens(text, settings);
  const quizGenerationTokens = estimateAllChunksQuizTokens(
    text,
    questionCount,
    settings,
  );
  return {
    summarizationTokens,
    quizGenerationTokens,
    totalEstimatedTokens: summarizationTokens + quizGenerationTokens,
  };
}

export function getDefaultGenerationSettings(): GenerationSettings {
  return { ...DEFAULT_GENERATION_SETTINGS };
}

export async function getGenerationSettings(): Promise<GenerationSettings> {
  const stored = await adminRepository.selectAppSettingByKey(SETTINGS_KEY);
  if (!stored) {
    return getDefaultGenerationSettings();
  }
  return sanitizeGenerationSettings(stored.value);
}

export async function updateGenerationSettings(
  settings: unknown,
): Promise<GenerationSettings> {
  const normalized = sanitizeGenerationSettings(settings);
  await adminRepository.upsertAppSetting(SETTINGS_KEY, normalized);
  return normalized;
}

export async function resetGenerationSettings(): Promise<GenerationSettings> {
  const defaults = getDefaultGenerationSettings();
  await adminRepository.upsertAppSetting(SETTINGS_KEY, defaults);
  return defaults;
}

export function estimateTextTokenCount(
  text: string,
  settings: GenerationSettings,
): number {
  return Math.max(0, Math.ceil(text.length * settings.tokensPerChar));
}

/** Estimated total tokens for generation: input text + per-question overhead. */
export function estimateTokenCount(
  text: string,
  questionCount: number,
  settings: GenerationSettings,
): number {
  const textTokens = estimateTextTokenCount(text, settings);
  const q =
    Number.isInteger(questionCount) && questionCount > 0 ? questionCount : 0;
  const questionTokens = q * settings.tokensPerQuestion;
  return Math.max(1, Math.floor(textTokens + questionTokens));
}

export function estimateQuestionCount(
  text: string,
  settings: GenerationSettings,
): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return settings.defaultQuestions;
  }
  const chunkCount = estimateDocumentChunkCount(trimmed, settings);
  const raw = Math.round(chunkCount * settings.questionsPerChunk);
  const bounded = Math.max(settings.minQuestions, raw);
  return Math.min(settings.maxQuestions, bounded);
}

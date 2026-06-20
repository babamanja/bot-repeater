import { getPrisma } from "./prisma.js";

export type QuizGenerationAnalyticsStatus = "success" | "failed";

export type InsertQuizGenerationAnalyticsInput = {
  userId: number | null;
  status: QuizGenerationAnalyticsStatus;
  sourceTextLength: number;
  generatedQuestionsCount: number;
  estimatedTokens: number;
  aiInputTokens?: number | null;
  aiOutputTokens?: number | null;
  aiTotalTokens?: number | null;
  aiModel?: string | null;
  errorMessage?: string | null;
};

function normalizeNonNegativeInteger(value: number): number {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeNullableNonNegativeInteger(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export async function insertQuizGenerationAnalytics(
  input: InsertQuizGenerationAnalyticsInput,
): Promise<void> {
  await getPrisma().quizGenerationAnalytics.create({
    data: {
      userId: input.userId,
      status: input.status,
      sourceTextLength: normalizeNonNegativeInteger(input.sourceTextLength),
      generatedQuestionsCount: normalizeNonNegativeInteger(
        input.generatedQuestionsCount,
      ),
      estimatedTokens: normalizeNonNegativeInteger(input.estimatedTokens),
      aiInputTokens: normalizeNullableNonNegativeInteger(input.aiInputTokens),
      aiOutputTokens: normalizeNullableNonNegativeInteger(input.aiOutputTokens),
      aiTotalTokens: normalizeNullableNonNegativeInteger(input.aiTotalTokens),
      aiModel: input.aiModel?.trim() || null,
      errorMessage: input.errorMessage
        ? input.errorMessage.slice(0, 2000)
        : null,
    },
  });
}

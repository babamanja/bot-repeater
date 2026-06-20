import type { Quiz, QuizExtended, QuizGenerateStarted } from "../types";
import { apiClient } from "./_api";

export type QuizGenerationSettingsPreview = {
  ok: true;
  settings: {
    tokensPerChar: number;
    tokensPerQuestion: number;
    questionsPerChunk: number;
    chunkSizeChars: number;
    chunkOverlapChars: number;
    tokensPerChunkSummary: number;
    tokensPerOcrImage: number;
    minQuestions: number;
    maxQuestions: number;
    defaultQuestions: number;
  };
  /** Quiz-only estimate (chunk summary text when upload text is provided). */
  estimatedTokens: number;
  summarizationTokens: number;
  quizGenerationTokens: number;
  totalEstimatedTokens: number;
  estimatedQuestions: number;
};

export async function generateQuiz(
  input:
    | { text: string; questionCount?: number; language?: string }
    | {
        documentId: string;
        chunkId?: string;
        questionCount?: number;
        language?: string;
      },
): Promise<QuizGenerateStarted> {
  const { data } = await apiClient.post<QuizGenerateStarted>("/quiz/generate", input);
  return data;
}

export async function getQuizGenerationSettings(
  text: string,
  options?: { questionCount?: number },
): Promise<QuizGenerationSettingsPreview> {
  const { data } = await apiClient.post<QuizGenerationSettingsPreview>(
    "/quiz/generation-settings",
    {
      text,
      ...(options?.questionCount !== undefined
        ? { questionCount: options.questionCount }
        : {}),
    },
  );
  return data;
}

export async function getQuizList(): Promise<Quiz[]> {
  const { data } = await apiClient.get<Quiz[]>("/quiz/list");
  return data;
}

export async function getQuizById(quizId: string): Promise<QuizExtended> {
  const { data } = await apiClient.get<QuizExtended>(`/quiz/${quizId}`);
  return data;
}

export async function getFullQuizById(quizId: string): Promise<QuizExtended> {
  const { data } = await apiClient.get<QuizExtended>(`/quiz/${quizId}/full`);
  return data;
}

export async function updateQuiz(
  quizId: string,
  quiz: QuizExtended,
): Promise<{ ok: true; version: number }> {
  const { data } = await apiClient.put<{ ok: true; version: number }>(`/quiz/${quizId}`, {
    quiz,
  });
  return data;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  await apiClient.delete(`/quiz/${quizId}`);
}

export async function regenerateQuiz(quizId: string): Promise<QuizGenerateStarted> {
  const { data } = await apiClient.post<QuizGenerateStarted>(`/quiz/${quizId}/regenerate`);
  return data;
}

export async function refundQuizTokens(
  quizId: string,
): Promise<{ tokensRefunded: number }> {
  const { data } = await apiClient.post<{ tokensRefunded: number }>(
    `/quiz/${quizId}/refund-tokens`,
  );
  return data;
}

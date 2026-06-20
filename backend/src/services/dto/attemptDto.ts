import type { QuizCheckAnswerPayloadDto } from "./quizCheckAnswerPayload.dto.js";

export type AttemptDto = {
  id: string;
  quizId: string;
  userId: number | null;
  quizTitle: string;
  acceptedAt: string;
  correctCount: number;
  questionCount: number;
  quizVersion: number;
  questions: Array<{
    id: string;
    prompt: string;
    correctAnswerIds: string[];
    options: Array<{
      answerId: string;
      text: string;
    }>;
  }>;
  answers: QuizCheckAnswerPayloadDto[];
};

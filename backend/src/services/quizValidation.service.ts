import * as quizRepository from "../db/quizRepository.js";
import { QuizCheckAnswerPayloadDto } from "./dto/quizCheckAnswerPayload.dto.js";
import { FullQuizDto, CuttedQuizDto } from "./dto/quizDto.js";
import { isUuid } from "../utils/uuid.js";

export function isFullQuizDto(input: unknown): input is FullQuizDto {
  if (!input || typeof input !== "object") return false;
  const obj = input as FullQuizDto;
  if (typeof obj.title !== "string" || !Array.isArray(obj.questions))
    return false;
  return obj.questions.every((q) => {
    if (!q || typeof q !== "object") return false;
    const qq = q as {
      id?: unknown;
      prompt?: unknown;
      correctAnswerIds?: unknown;
      options?: unknown;
    };
    if (
      typeof qq.id !== "string" ||
      !isUuid(qq.id) ||
      typeof qq.prompt !== "string" ||
      !Array.isArray(qq.correctAnswerIds) ||
      !Array.isArray(qq.options)
    ) {
      return false;
    }
    const optionIds = new Set<string>();
    const optionsValid = qq.options.every((o) => {
      if (!o || typeof o !== "object") return false;
      const oo = o as { answerId?: unknown; text?: unknown };
      const valid =
        typeof oo.answerId === "string" &&
        isUuid(oo.answerId) &&
        typeof oo.text === "string";
      if (valid) {
        optionIds.add(String(oo.answerId));
      }
      return valid;
    });
    if (!optionsValid || optionIds.size !== qq.options.length) {
      return false;
    }
    return qq.correctAnswerIds.every(
      (id) => typeof id === "string" && isUuid(id) && optionIds.has(id),
    );
  });
}

export function isValidAnswersPayload(
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

export function removePrivateDataFromQuestion(
  quizId: string,
  internal: FullQuizDto,
): CuttedQuizDto {
  return {
    id: quizId,
    title: internal.title,
    questions: internal.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      isMultipleChoice: q.correctAnswerIds.length > 1,
      options: q.options.map((o) => ({
        answerId: o.answerId,
        text: o.text,
      })),
    })),
  };
}

export type QuizOwnerCheck =
  | { ok: true; context: quizRepository.QuizGenerationContext }
  | { ok: false; status: number; error: string };

export async function assertQuizOwner(
  quizId: string,
  userId: number,
): Promise<QuizOwnerCheck> {
  const context = await quizRepository.selectQuizGenerationContext(quizId);
  if (!context) {
    return { ok: false, status: 404, error: "quiz not found" };
  }
  if (context.createdBy !== userId) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true, context };
}

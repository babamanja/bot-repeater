export const QUIZ_STATUSES = [
  "generating",
  "ready_to_edit",
  "published",
  "failed",
] as const;

export type QuizStatus = (typeof QUIZ_STATUSES)[number];

export function isQuizStatus(value: unknown): value is QuizStatus {
  return typeof value === "string" && (QUIZ_STATUSES as readonly string[]).includes(value);
}

/** Quiz has generated content and can be taken or edited. */
export function isQuizPlayable(status: QuizStatus): boolean {
  return status === "published" || status === "ready_to_edit";
}

export type QuestionOutcome = "correct" | "wrong" | "partial";

export function getQuestionOutcome(
  selectedAnswerIds: string[],
  correctAnswerIds: string[],
  isMultipleChoice: boolean,
): QuestionOutcome {
  const selected = [...new Set(selectedAnswerIds)];
  const correct = [...new Set(correctAnswerIds)];

  if (correct.length === 0) {
    return "wrong";
  }

  const correctHits = selected.filter((id) => correct.includes(id)).length;

  if (correctHits === 0) {
    return "wrong";
  }

  const isExactMatch =
    selected.length === correct.length && selected.every((id) => correct.includes(id));

  if (isExactMatch) {
    return "correct";
  }

  return isMultipleChoice ? "partial" : "wrong";
}

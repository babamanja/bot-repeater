import { scheduleAfterCorrect, scheduleAfterWrong } from "@vocab-bot/shared/pimsleurSchedule";

import type { ReviewResult, ReviewWord } from "../../api/words";

export function reviewScheduleForDisplay(
  card: ReviewWord,
  revealed: ReviewResult & { awaitingConfirmation?: boolean },
): { pimsleurLevel: number; nextReviewMs: number } {
  if (
    Number.isFinite(revealed.pimsleurLevel) &&
    Number.isFinite(revealed.nextReviewMs) &&
    revealed.nextReviewMs > 0
  ) {
    return {
      pimsleurLevel: revealed.pimsleurLevel,
      nextReviewMs: revealed.nextReviewMs,
    };
  }

  const nowMs = Date.now();
  const cardLevel = card.pimsleurLevel ?? 0;

  if (revealed.awaitingConfirmation) {
    return {
      pimsleurLevel: cardLevel,
      nextReviewMs: card.nextReviewMs != null && card.nextReviewMs > 0 ? card.nextReviewMs : nowMs,
    };
  }

  if (revealed.correct) {
    return scheduleAfterCorrect(cardLevel, nowMs);
  }

  return scheduleAfterWrong(nowMs);
}

export type ReviewCardDirection = "learning_to_primary" | "primary_to_learning";

export type CardSchedule = {
  pimsleurLevel: number;
  nextReviewMs: bigint;
};

export type PairCardSchedules = {
  learningToPrimary: CardSchedule;
  primaryToLearning: CardSchedule;
};

export type DictionaryEntrySchedules = {
  pimsleurLevel: number;
  nextReviewMs: bigint;
  pimsleurLevelReverse: number;
  nextReviewMsReverse: bigint;
};

export function entryToPairSchedules(entry: DictionaryEntrySchedules): PairCardSchedules {
  return {
    learningToPrimary: {
      pimsleurLevel: entry.pimsleurLevel,
      nextReviewMs: entry.nextReviewMs,
    },
    primaryToLearning: {
      pimsleurLevel: entry.pimsleurLevelReverse,
      nextReviewMs: entry.nextReviewMsReverse,
    },
  };
}

export function pairPimsleurLevel(schedules: PairCardSchedules): number {
  return Math.min(
    schedules.learningToPrimary.pimsleurLevel,
    schedules.primaryToLearning.pimsleurLevel,
  );
}

export function pairNextReviewMs(schedules: PairCardSchedules): bigint {
  const forward = schedules.learningToPrimary.nextReviewMs;
  const reverse = schedules.primaryToLearning.nextReviewMs;
  return forward < reverse ? forward : reverse;
}

export function isPairDue(schedules: PairCardSchedules, nowMs: bigint): boolean {
  return (
    schedules.learningToPrimary.nextReviewMs <= nowMs ||
    schedules.primaryToLearning.nextReviewMs <= nowMs
  );
}

export function selectWorstCardDirection(schedules: PairCardSchedules): ReviewCardDirection {
  const forward = schedules.learningToPrimary;
  const reverse = schedules.primaryToLearning;

  if (forward.pimsleurLevel < reverse.pimsleurLevel) {
    return "learning_to_primary";
  }
  if (reverse.pimsleurLevel < forward.pimsleurLevel) {
    return "primary_to_learning";
  }
  if (forward.nextReviewMs < reverse.nextReviewMs) {
    return "learning_to_primary";
  }
  if (reverse.nextReviewMs < forward.nextReviewMs) {
    return "primary_to_learning";
  }
  return "primary_to_learning";
}

export function scheduleForDirection(
  schedules: PairCardSchedules,
  direction: ReviewCardDirection,
): CardSchedule {
  return direction === "learning_to_primary"
    ? schedules.learningToPrimary
    : schedules.primaryToLearning;
}

export function isValidReviewCardDirection(value: unknown): value is ReviewCardDirection {
  return value === "learning_to_primary" || value === "primary_to_learning";
}

export function entryToPairSchedules(entry) {
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
export function pairPimsleurLevel(schedules) {
    return Math.min(schedules.learningToPrimary.pimsleurLevel, schedules.primaryToLearning.pimsleurLevel);
}
export function pairNextReviewMs(schedules) {
    const forward = schedules.learningToPrimary.nextReviewMs;
    const reverse = schedules.primaryToLearning.nextReviewMs;
    return forward < reverse ? forward : reverse;
}
export function isPairDue(schedules, nowMs) {
    return (schedules.learningToPrimary.nextReviewMs <= nowMs ||
        schedules.primaryToLearning.nextReviewMs <= nowMs);
}
export function selectWorstCardDirection(schedules) {
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
export function scheduleForDirection(schedules, direction) {
    return direction === "learning_to_primary"
        ? schedules.learningToPrimary
        : schedules.primaryToLearning;
}
export function isValidReviewCardDirection(value) {
    return value === "learning_to_primary" || value === "primary_to_learning";
}

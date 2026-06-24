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
export declare function entryToPairSchedules(entry: DictionaryEntrySchedules): PairCardSchedules;
export declare function pairPimsleurLevel(schedules: PairCardSchedules): number;
export declare function pairNextReviewMs(schedules: PairCardSchedules): bigint;
export declare function isPairDue(schedules: PairCardSchedules, nowMs: bigint): boolean;
export declare function selectWorstCardDirection(schedules: PairCardSchedules): ReviewCardDirection;
export declare function scheduleForDirection(schedules: PairCardSchedules, direction: ReviewCardDirection): CardSchedule;
export declare function isValidReviewCardDirection(value: unknown): value is ReviewCardDirection;
//# sourceMappingURL=vocabReviewCard.d.ts.map
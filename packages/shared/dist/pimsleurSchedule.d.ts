/**
 * Pimsleur-style ladder: delay until the next review after landing at this level.
 */
export declare const PIMSLEUR_LEVEL_MAX = 10;
export declare const PIMSLEUR_DELAYS_MS: readonly number[];
export declare function intervalMsForLevel(level: number): number;
export declare function scheduleAfterCorrect(currentLevel: number, nowMs?: number): {
    pimsleurLevel: number;
    nextReviewMs: number;
};
export declare function scheduleAfterWrong(nowMs?: number): {
    pimsleurLevel: number;
    nextReviewMs: number;
};
//# sourceMappingURL=pimsleurSchedule.d.ts.map
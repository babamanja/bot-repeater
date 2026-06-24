/** @deprecated Use {@link reviewRetentionThresholdForLevel} for per-level thresholds. */
export declare const REVIEW_RETENTION_THRESHOLD = 0.7;
/** Fraction of memory lost by the time the next review is due (0–1). */
export declare function reviewLossFractionForLevel(level: number): number;
/** Retention at review time for a Pimsleur stage (1 − loss). */
export declare function reviewRetentionThresholdForLevel(level: number): number;
export declare function retentionAtElapsed(elapsedMs: number, intervalMs: number, threshold?: number): number;
export type ForgettingCurveWindow = {
    intervalMs: number;
    lastReviewMs: number;
    nextReviewMs: number;
    elapsedMs: number;
    retention: number;
    isOverdue: boolean;
};
export declare function cumulativeOffsetBeforeLevel(level: number): number;
export declare function computeForgettingCurveWindow(pimsleurLevel: number, nextReviewMs: number, nowMs?: number): ForgettingCurveWindow;
export type RollerCoasterSegment = {
    level: number;
    intervalMs: number;
    timelineStartMs: number;
    timelineEndMs: number;
};
export type FullLadderSegment = {
    level: number;
    intervalMs: number;
};
export type FullLadderTimeline = {
    pimsleurLevel: number;
    segments: FullLadderSegment[];
    elapsedInCurrentMs: number;
    currentSegmentProgress: number;
    retention: number;
    isOverdue: boolean;
};
export type FullLadderPoint = {
    segmentIndex: number;
    segmentProgress: number;
    retention: number;
    phase: "past" | "current" | "future";
};
export declare function totalLadderTimelineMs(segments: Array<{
    intervalMs: number;
}>): number;
export declare function timelineMsAtSegmentProgress(segments: Array<{
    intervalMs: number;
}>, segmentIndex: number, segmentProgress: number): number;
/** Map elapsed time to [0, 1] on a linear axis. */
export declare function mapTimelineMsToLinearAxisUnit(timelineMs: number, totalMs: number): number;
/** Map elapsed time to [0, 1] on a log10 axis (0 ms maps to 0). */
export declare function mapTimelineMsToLogAxisUnit(timelineMs: number, totalMs: number): number;
export declare function computeFullLadderTimeline(pimsleurLevel: number, nextReviewMs: number, nowMs?: number): FullLadderTimeline;
export declare function sampleFullLadderCurve(timeline: FullLadderTimeline, stepsPerSegment?: number, options?: {
    projectCurrentSegment?: boolean;
}): FullLadderPoint[];
export type RollerCoasterTimeline = {
    pimsleurLevel: number;
    segments: RollerCoasterSegment[];
    timelineNowMs: number;
    nextReviewTimelineMs: number;
    retention: number;
    isOverdue: boolean;
};
export declare function computeRollerCoasterTimeline(pimsleurLevel: number, nextReviewMs: number, nowMs?: number): RollerCoasterTimeline;
export type ForgettingCurvePoint = {
    elapsedMs: number;
    retention: number;
};
export type RollerCoasterPoint = {
    timelineMs: number;
    retention: number;
};
export declare function sampleForgettingCurve(intervalMs: number, steps?: number, threshold?: number): ForgettingCurvePoint[];
export declare function sampleRollerCoasterCurve(timeline: RollerCoasterTimeline, stepsPerSegment?: number): RollerCoasterPoint[];
//# sourceMappingURL=forgettingCurve.d.ts.map
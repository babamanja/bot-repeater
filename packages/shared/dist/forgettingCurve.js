import { intervalMsForLevel, PIMSLEUR_LEVEL_MAX } from "./pimsleurSchedule.js";
/** @deprecated Use {@link reviewRetentionThresholdForLevel} for per-level thresholds. */
export const REVIEW_RETENTION_THRESHOLD = 0.7;
/**
 * Share of memory lost by review time per stage (level 0 = first interval).
 * Retention at review = 1 − loss.
 */
const REVIEW_LOSS_FRACTION_BY_LEVEL = [
    1.0, // 100%
    0.6, // 60%
    0.4, // 40%
    0.3, // 30%
    0.2, // 20% for levels 4–10
    0.2,
    0.2,
    0.2,
    0.2,
    0.2,
    0.2,
];
if (REVIEW_LOSS_FRACTION_BY_LEVEL.length !== PIMSLEUR_LEVEL_MAX + 1) {
    throw new Error("REVIEW_LOSS_FRACTION_BY_LEVEL must have length PIMSLEUR_LEVEL_MAX + 1");
}
/** Fraction of memory lost by the time the next review is due (0–1). */
export function reviewLossFractionForLevel(level) {
    const clamped = Math.max(0, Math.min(level, PIMSLEUR_LEVEL_MAX));
    return REVIEW_LOSS_FRACTION_BY_LEVEL[clamped] ?? 0.2;
}
/** Retention at review time for a Pimsleur stage (1 − loss). */
export function reviewRetentionThresholdForLevel(level) {
    return 1 - reviewLossFractionForLevel(level);
}
/** Used only to compute tau when the review threshold is 0 or 1 (log is undefined at exactly 0/1). */
const REVIEW_RETENTION_EPSILON = 1e-9;
function decayThresholdForTau(threshold) {
    if (threshold <= 0) {
        return REVIEW_RETENTION_EPSILON;
    }
    if (threshold >= 1) {
        return 1 - REVIEW_RETENTION_EPSILON;
    }
    return threshold;
}
export function retentionAtElapsed(elapsedMs, intervalMs, threshold = REVIEW_RETENTION_THRESHOLD) {
    if (intervalMs <= 0) {
        return 1;
    }
    if (threshold >= 1) {
        return 1;
    }
    const clampedElapsed = Math.max(0, Math.min(elapsedMs, intervalMs));
    if (clampedElapsed >= intervalMs) {
        return Math.max(0, threshold);
    }
    const tau = intervalMs / -Math.log(decayThresholdForTau(threshold));
    const retention = Math.exp(-clampedElapsed / tau);
    return Math.max(0, Math.min(1, retention));
}
export function cumulativeOffsetBeforeLevel(level) {
    const clamped = Math.max(0, Math.min(level, PIMSLEUR_LEVEL_MAX));
    let sum = 0;
    for (let i = 0; i < clamped; i += 1) {
        sum += intervalMsForLevel(i);
    }
    return sum;
}
export function computeForgettingCurveWindow(pimsleurLevel, nextReviewMs, nowMs = Date.now()) {
    const level = Math.max(0, Math.min(pimsleurLevel, PIMSLEUR_LEVEL_MAX));
    const intervalMs = intervalMsForLevel(level);
    const threshold = reviewRetentionThresholdForLevel(level);
    const lastReviewMs = nextReviewMs - intervalMs;
    const isOverdue = nowMs >= nextReviewMs;
    const elapsedMs = isOverdue ? intervalMs : Math.max(0, nowMs - lastReviewMs);
    const retention = isOverdue
        ? threshold
        : retentionAtElapsed(elapsedMs, intervalMs, threshold);
    return {
        intervalMs,
        lastReviewMs,
        nextReviewMs,
        elapsedMs,
        retention,
        isOverdue,
    };
}
export function totalLadderTimelineMs(segments) {
    return segments.reduce((sum, segment) => sum + segment.intervalMs, 0);
}
export function timelineMsAtSegmentProgress(segments, segmentIndex, segmentProgress) {
    let ms = 0;
    for (let i = 0; i < segmentIndex; i += 1) {
        ms += segments[i].intervalMs;
    }
    if (segmentIndex >= 0 && segmentIndex < segments.length) {
        ms += segmentProgress * segments[segmentIndex].intervalMs;
    }
    return ms;
}
/** Map elapsed time to [0, 1] on a linear axis. */
export function mapTimelineMsToLinearAxisUnit(timelineMs, totalMs) {
    if (totalMs <= 0) {
        return 0;
    }
    return Math.max(0, Math.min(1, timelineMs / totalMs));
}
/** Map elapsed time to [0, 1] on a log10 axis (0 ms maps to 0). */
export function mapTimelineMsToLogAxisUnit(timelineMs, totalMs) {
    if (totalMs <= 0 || timelineMs <= 0) {
        return 0;
    }
    const log = (ms) => Math.log10(ms + 1);
    return log(timelineMs) / log(totalMs);
}
export function computeFullLadderTimeline(pimsleurLevel, nextReviewMs, nowMs = Date.now()) {
    const level = Math.max(0, Math.min(pimsleurLevel, PIMSLEUR_LEVEL_MAX));
    const window = computeForgettingCurveWindow(level, nextReviewMs, nowMs);
    const segments = [];
    for (let i = 0; i <= PIMSLEUR_LEVEL_MAX; i += 1) {
        segments.push({
            level: i,
            intervalMs: intervalMsForLevel(i),
        });
    }
    const currentSegmentProgress = window.isOverdue
        ? 1
        : window.intervalMs > 0
            ? window.elapsedMs / window.intervalMs
            : 0;
    return {
        pimsleurLevel: level,
        segments,
        elapsedInCurrentMs: window.elapsedMs,
        currentSegmentProgress,
        retention: window.retention,
        isOverdue: window.isOverdue,
    };
}
export function sampleFullLadderCurve(timeline, stepsPerSegment = 14, options) {
    const points = [];
    const { segments, pimsleurLevel, currentSegmentProgress, isOverdue } = timeline;
    const projectCurrentSegment = options?.projectCurrentSegment ?? false;
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        const phase = segmentIndex < pimsleurLevel
            ? "past"
            : segmentIndex > pimsleurLevel
                ? "future"
                : "current";
        const maxProgress = phase === "past"
            ? 1
            : phase === "future"
                ? 1
                : isOverdue
                    ? 1
                    : projectCurrentSegment
                        ? Math.max(currentSegmentProgress, 1)
                        : currentSegmentProgress;
        const steps = Math.max(2, Math.round(maxProgress * stepsPerSegment));
        for (let i = 0; i <= steps; i += 1) {
            const segmentProgress = (maxProgress * i) / steps;
            const threshold = reviewRetentionThresholdForLevel(segment.level);
            points.push({
                segmentIndex,
                segmentProgress,
                retention: retentionAtElapsed(segmentProgress * segment.intervalMs, segment.intervalMs, threshold),
                phase,
            });
        }
        if (phase !== "current" && segmentIndex < segments.length - 1) {
            const threshold = reviewRetentionThresholdForLevel(segment.level);
            points.push({
                segmentIndex,
                segmentProgress: 1,
                retention: threshold,
                phase,
            });
            points.push({
                segmentIndex,
                segmentProgress: 1,
                retention: 1,
                phase,
            });
        }
    }
    return points;
}
export function computeRollerCoasterTimeline(pimsleurLevel, nextReviewMs, nowMs = Date.now()) {
    const level = Math.max(0, Math.min(pimsleurLevel, PIMSLEUR_LEVEL_MAX));
    const window = computeForgettingCurveWindow(level, nextReviewMs, nowMs);
    const segments = [];
    for (let i = 0; i <= level; i += 1) {
        const intervalMs = intervalMsForLevel(i);
        const timelineStartMs = cumulativeOffsetBeforeLevel(i);
        segments.push({
            level: i,
            intervalMs,
            timelineStartMs,
            timelineEndMs: timelineStartMs + intervalMs,
        });
    }
    return {
        pimsleurLevel: level,
        segments,
        timelineNowMs: cumulativeOffsetBeforeLevel(level) + window.elapsedMs,
        nextReviewTimelineMs: cumulativeOffsetBeforeLevel(level) + window.intervalMs,
        retention: window.retention,
        isOverdue: window.isOverdue,
    };
}
export function sampleForgettingCurve(intervalMs, steps = 48, threshold = REVIEW_RETENTION_THRESHOLD) {
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
        const elapsedMs = (intervalMs * i) / steps;
        points.push({
            elapsedMs,
            retention: retentionAtElapsed(elapsedMs, intervalMs, threshold),
        });
    }
    return points;
}
export function sampleRollerCoasterCurve(timeline, stepsPerSegment = 20) {
    const points = [];
    const { segments, timelineNowMs, isOverdue } = timeline;
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        const isCurrent = segmentIndex === segments.length - 1;
        const maxElapsed = isCurrent
            ? isOverdue
                ? segment.intervalMs
                : Math.max(0, Math.min(segment.intervalMs, timelineNowMs - segment.timelineStartMs))
            : segment.intervalMs;
        const steps = Math.max(2, Math.round((maxElapsed / segment.intervalMs) * stepsPerSegment));
        for (let i = 0; i <= steps; i += 1) {
            const elapsedMs = (maxElapsed * i) / steps;
            const threshold = reviewRetentionThresholdForLevel(segment.level);
            points.push({
                timelineMs: segment.timelineStartMs + elapsedMs,
                retention: retentionAtElapsed(elapsedMs, segment.intervalMs, threshold),
            });
        }
        if (!isCurrent) {
            const threshold = reviewRetentionThresholdForLevel(segment.level);
            points.push({
                timelineMs: segment.timelineEndMs,
                retention: threshold,
            });
            points.push({
                timelineMs: segment.timelineEndMs,
                retention: 1,
            });
        }
    }
    return points;
}

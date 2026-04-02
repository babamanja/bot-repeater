/**
 * Pimsleur-style ladder (original spacing): each value is the delay until the next review
 * after the card lands in that box (after a correct answer advances to this level).
 */
export const PIMSLEUR_LEVEL_MAX = 10;

/** Milliseconds from "now" to next review when the card sits at this level (after success). */
export const PIMSLEUR_DELAYS_MS: readonly number[] = [
  5 * 1000, // 5 sec
  25 * 1000, // 25 sec
  2 * 60 * 1000, // 2 min
  10 * 60 * 1000, // 10 min
  60 * 60 * 1000, // 1 h
  5 * 60 * 60 * 1000, // 5 h
  24 * 60 * 60 * 1000, // 1 day
  5 * 24 * 60 * 60 * 1000, // 5 days
  25 * 24 * 60 * 60 * 1000, // 25 days
  Math.round(4 * 30.4375 * 24 * 60 * 60 * 1000), // ~4 calendar months
  2 * 365.25 * 24 * 60 * 60 * 1000, // ~2 years
];

function assertLadderLength(): void {
  if (PIMSLEUR_DELAYS_MS.length !== PIMSLEUR_LEVEL_MAX + 1) {
    throw new Error('PIMSLEUR_DELAYS_MS must have length PIMSLEUR_LEVEL_MAX + 1');
  }
}
assertLadderLength();

/** New / failed card: level 0, first review after shortest delay. */
export function initialSchedule(nowMs: number): { pimsleurLevel: number; nextReviewMs: bigint } {
  return {
    pimsleurLevel: 0,
    nextReviewMs: BigInt(nowMs + PIMSLEUR_DELAYS_MS[0]),
  };
}

/** Correct answer: move to next box; next review uses that box's delay. */
export function scheduleAfterCorrect(currentLevel: number, nowMs: number): { pimsleurLevel: number; nextReviewMs: bigint } {
  const nextLevel = Math.min(currentLevel + 1, PIMSLEUR_LEVEL_MAX);
  return {
    pimsleurLevel: nextLevel,
    nextReviewMs: BigInt(nowMs + PIMSLEUR_DELAYS_MS[nextLevel]),
  };
}

/** Wrong answer: back to the shortest interval. */
export function scheduleAfterWrong(nowMs: number): { pimsleurLevel: number; nextReviewMs: bigint } {
  return initialSchedule(nowMs);
}

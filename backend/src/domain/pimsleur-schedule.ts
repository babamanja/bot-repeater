/** Milliseconds from "now" to next review when the card sits at this level (after success). */
const PIMSLEUR_DELAYS_MS: readonly number[] = [
  5 * 1000,
  25 * 1000,
  2 * 60 * 1000,
  10 * 60 * 1000,
  60 * 60 * 1000,
  5 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
  25 * 24 * 60 * 60 * 1000,
  Math.round(4 * 30.4375 * 24 * 60 * 60 * 1000),
  2 * 365.25 * 24 * 60 * 60 * 1000,
];

export function initialSchedule(nowMs: number): { pimsleurLevel: number; nextReviewMs: bigint } {
  return {
    pimsleurLevel: 0,
    nextReviewMs: BigInt(nowMs + PIMSLEUR_DELAYS_MS[0]),
  };
}

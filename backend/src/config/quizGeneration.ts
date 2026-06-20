const DEFAULT_QUIZ_GENERATION_TIMEOUT_MS = 5 * 60 * 1000;
const MIN_QUIZ_GENERATION_TIMEOUT_MS = 30_000;

/** Max time a quiz may stay in `generating` before it is marked `failed`. */
export function getQuizGenerationTimeoutMs(): number {
  const raw = process.env.QUIZ_GENERATION_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_QUIZ_GENERATION_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < MIN_QUIZ_GENERATION_TIMEOUT_MS) {
    return DEFAULT_QUIZ_GENERATION_TIMEOUT_MS;
  }
  return parsed;
}

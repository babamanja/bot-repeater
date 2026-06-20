import {
  scheduleInternalJobContinue,
  verifyInternalJobToken,
} from "./internalJobChain.service.js";

const TOKEN_SCOPE = "quiz-generation-continue";
const BASE_URL_ENV_KEY = "QUIZ_GENERATION_CHAIN_BASE_URL";
const HEADER_NAME = "X-Quiz-Generation-Token";
const LOG_PREFIX = "quiz-generation";

export function verifyQuizGenerationInternalToken(
  quizId: string,
  token: unknown,
): boolean {
  return verifyInternalJobToken(quizId, token, TOKEN_SCOPE);
}

async function runQuizGenerationContinueInProcess(quizId: string): Promise<void> {
  const { processQuizGenerationInternal } = await import("./quiz.service.js");
  await processQuizGenerationInternal(quizId);
}

/** Fire-and-forget: runs quiz generation in a dedicated serverless invocation on Vercel. */
export function scheduleQuizGenerationContinue(quizId: string): void {
  scheduleInternalJobContinue({
    id: quizId,
    tokenScope: TOKEN_SCOPE,
    baseUrlEnvKey: BASE_URL_ENV_KEY,
    headerName: HEADER_NAME,
    buildContinuePath: (id) =>
      `/api/internal/quiz-generation/${encodeURIComponent(id)}/continue`,
    runInProcess: runQuizGenerationContinueInProcess,
    logger: {
      log(event, ctx, extra) {
        console.log(`[${LOG_PREFIX}] ${event}`, { quizId: ctx.id, ...extra });
      },
      warn(event, ctx, extra) {
        console.warn(`[${LOG_PREFIX}] ${event}`, { quizId: ctx.id, ...extra });
      },
    },
  });
}

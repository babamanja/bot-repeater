import { ocrLog, ocrWarn } from "./ocrLogger.js";
import {
  scheduleInternalJobContinue,
  verifyInternalJobToken,
  type InternalJobChainLogger,
} from "./internalJobChain.service.js";

const TOKEN_SCOPE = "pdf-ocr-continue";
const BASE_URL_ENV_KEY = "PDF_OCR_CHAIN_BASE_URL";
const HEADER_NAME = "X-Pdf-Ocr-Token";

const ocrChainLogger: InternalJobChainLogger = {
  log(event, ctx, extra) {
    ocrLog(event, { jobId: String(ctx.id) }, extra);
  },
  warn(event, ctx, extra) {
    ocrWarn(event, { jobId: String(ctx.id) }, extra);
  },
};

export function verifyPdfOcrInternalToken(jobId: string, token: unknown): boolean {
  return verifyInternalJobToken(jobId, token, TOKEN_SCOPE);
}

async function runPdfOcrContinueInProcess(jobId: string): Promise<void> {
  const { processNextOcrPageInternal } = await import("./pdfOcrJob.service.js");
  await processNextOcrPageInternal(jobId);
}

/** Fire-and-forget: processes up to PDF_OCR_PAGES_PER_STEP pages, then chains again. */
export function schedulePdfOcrJobContinue(jobId: string): void {
  scheduleInternalJobContinue({
    id: jobId,
    tokenScope: TOKEN_SCOPE,
    baseUrlEnvKey: BASE_URL_ENV_KEY,
    headerName: HEADER_NAME,
    buildContinuePath: (id) =>
      `/api/internal/pdf-ocr-jobs/${encodeURIComponent(id)}/continue`,
    runInProcess: runPdfOcrContinueInProcess,
    logger: ocrChainLogger,
  });
}

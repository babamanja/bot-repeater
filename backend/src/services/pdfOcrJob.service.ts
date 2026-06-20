import { randomUUID } from "node:crypto";

import type { PdfOcrJobPageStatus } from "@prisma/client";

import { PDF_OCR_PAGES_PER_STEP } from "../config/pdfOcr.js";
import {
  applyPdfPagePolicy,
  buildPagePreview,
  type GenerationUploadProfile,
} from "../config/generationUploadProfile.js";
import { UPLOAD_MAX_BYTES_BASIC } from "../config/uploadLimits.js";
import * as pdfOcrJobRepository from "../db/pdfOcrJobRepository.js";
import * as tokenRepository from "../db/tokenRepository.js";
import {
  estimateOcrImageTokenCost,
  estimatePdfOcrTokenCost,
  getGenerationSettings,
} from "./generationSettings.service.js";
import { extractTextWithOcrSpace, isOcrAvailable } from "./ocrExtractor.js";
import { extractPdfPageTexts } from "./pdfExtractor.js";
import { renderPdfPageToPng } from "./pdfPageRenderer.js";
import { schedulePdfOcrJobContinue } from "./pdfOcrJobChain.service.js";
import { ocrLog, ocrWarn } from "./ocrLogger.js";

type UploadFileInput = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

type ServiceContext = {
  requestId?: string;
  maxBytes?: number;
  uploadProfile?: GenerationUploadProfile;
};

function isPdfUpload(file: UploadFileInput): boolean {
  const mime = file.mimetype?.trim().toLowerCase();
  if (mime === "application/pdf") {
    return true;
  }
  return file.originalname?.trim().toLowerCase().endsWith(".pdf") ?? false;
}

async function chargePdfOcrTokens(
  userId: number,
  jobId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (amount < 1) {
    return { ok: true as const };
  }
  try {
    await tokenRepository.spendTokensForUser({
      userId,
      amount,
      referenceId: jobId,
      metadata: {
        source: "pdf_ocr_job",
        ...metadata,
      },
    });
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "token deduction failed";
    if (message === "insufficient token balance") {
      return {
        ok: false,
        status: 402,
        error: `INSUFFICIENT_TOKEN_BALANCE:${amount}`,
      };
    }
    return { ok: false, status: 500, error: "token deduction failed" };
  }
}

async function refundPdfOcrTokens(
  userId: number,
  jobId: string,
  amount: number,
  reason: string,
): Promise<void> {
  if (amount < 1) {
    return;
  }
  await tokenRepository.addTokensForUserIdempotent({
    userId,
    amount,
    transactionType: "refund",
    referenceId: jobId,
    idempotencyKey: tokenRepository.pdfOcrJobRefundIdempotencyKey(jobId, reason),
    metadata: { source: "pdf_ocr_job_refund", reason },
  });
}

function buildPageRecords(
  pages: Array<{ pageIndex: number; text: string }>,
): Array<{
  id: string;
  pageIndex: number;
  status: PdfOcrJobPageStatus;
  text: string | null;
}> {
  return pages.map((page) => {
    const hasText = Boolean(page.text.trim());
    return {
      id: randomUUID(),
      pageIndex: page.pageIndex,
      status: hasText ? "text_extracted" : "needs_ocr",
      text: hasText ? page.text : null,
    };
  });
}

export async function analyzePdfUpload(
  userId: number,
  file: UploadFileInput,
  ctx: ServiceContext = {},
) {
  const logCtx = { userId, requestId: ctx.requestId };
  ocrLog("analyze.start", logCtx, {
    filename: file.originalname,
    bytes: file.buffer?.length ?? file.size,
  });

  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    return { ok: false as const, status: 400, error: "file_required" };
  }
  if (!isPdfUpload(file)) {
    return { ok: false as const, status: 400, error: "unsupported_file_type" };
  }

  const maxBytes = ctx.uploadProfile?.maxBytes ?? ctx.maxBytes ?? UPLOAD_MAX_BYTES_BASIC;
  if ((file.size ?? file.buffer.length) > maxBytes) {
    return { ok: false as const, status: 413, error: "file_too_large" };
  }

  let parsed;
  try {
    parsed = await extractPdfPageTexts(file.buffer);
  } catch (error) {
    ocrWarn("analyze.parse_failed", logCtx, {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false as const, status: 422, error: "pdf_parse_failed" };
  }

  ocrLog("analyze.parsed", logCtx, {
    totalPages: parsed.totalPages,
    pagesWithText: parsed.pages.filter((p) => p.text.trim()).length,
  });

  if (parsed.totalPages < 1) {
    return { ok: false as const, status: 422, error: "pdf_parse_failed" };
  }

  const profile = ctx.uploadProfile;
  if (!profile) {
    return { ok: false as const, status: 500, error: "upload profile is required" };
  }

  const pagePolicy = applyPdfPagePolicy(
    parsed.pages,
    parsed.totalPages,
    profile,
  );
  if (pagePolicy.ok === false) {
    return { ok: false as const, status: 413, error: pagePolicy.error };
  }

  const settings = await getGenerationSettings();
  const tokenCostPerPage = estimateOcrImageTokenCost(settings);
  const pageRecords = buildPageRecords(pagePolicy.pages);
  const totalPages = pagePolicy.totalPages;
  const pagesNeedingOcr = pageRecords.filter((page) => page.status === "needs_ocr").length;
  const assembledText = pdfOcrJobRepository.assemblePageTexts(
    pageRecords.map((page) => ({
      page_index: page.pageIndex,
      text: page.text,
    })),
  );

  if (pagePolicy.truncated) {
    ocrLog("analyze.pages_truncated", logCtx, {
      originalPages: parsed.totalPages,
      usedPages: totalPages,
      maxPdfPages: profile.maxPdfPages,
    });
  }

  const shouldRequestPageSelection =
    profile.pdfPageOverflow === "user_select" &&
    (profile.maxSelectablePages ?? 0) > 0 &&
    totalPages > 1;

  if (shouldRequestPageSelection) {
    if (pagesNeedingOcr > 0 && !isOcrAvailable()) {
      return { ok: false as const, status: 422, error: "ocr_unavailable" };
    }

    const jobId = randomUUID();
    const job = await pdfOcrJobRepository.insertPdfOcrJob({
      id: jobId,
      userId,
      originalFilename: file.originalname?.trim() || "document.pdf",
      status: "awaiting_confirmation",
      totalPages,
      pagesNeedingOcr,
      tokenCostPerPage,
      assembledText: assembledText || null,
      pdfData: file.buffer,
      pages: pageRecords,
    });

    const pagePreviews = pageRecords.map((page) => ({
      pageIndex: page.pageIndex,
      pageNumber: page.pageIndex + 1,
      preview: buildPagePreview(page.text),
      needsOcr: page.status === "needs_ocr",
      hasText: Boolean(page.text?.trim()),
    }));

    ocrLog("analyze.page_selection_required", { jobId, userId }, {
      totalPages,
      pagesNeedingOcr,
      maxSelectablePages: profile.maxSelectablePages,
    });

    return {
      ok: true as const,
      result: {
        status: "page_selection_required" as const,
        job: pdfOcrJobRepository.toPublicPdfOcrJob(job),
        pages: pagePreviews,
        maxSelectablePages: profile.maxSelectablePages!,
        pdfPagesTruncated: pagePolicy.truncated,
        originalTotalPages: parsed.totalPages,
      },
    };
  }

  if (pagesNeedingOcr === 0) {
    ocrLog("analyze.no_ocr_needed", logCtx, {
      totalPages,
      assembledChars: assembledText.length,
    });
    return {
      ok: true as const,
      result: {
        status: "completed" as const,
        totalPages,
        pagesNeedingOcr: 0,
        tokenCostPerPage,
        totalTokenCost: 0,
        assembledText,
        pdfPagesTruncated: pagePolicy.truncated,
        originalTotalPages: parsed.totalPages,
      },
    };
  }

  if (!isOcrAvailable()) {
    return { ok: false as const, status: 422, error: "ocr_unavailable" };
  }

  const jobId = randomUUID();
  const job = await pdfOcrJobRepository.insertPdfOcrJob({
    id: jobId,
    userId,
    originalFilename: file.originalname?.trim() || "document.pdf",
    status: "awaiting_confirmation",
    totalPages,
    pagesNeedingOcr,
    tokenCostPerPage,
    assembledText: assembledText || null,
    pdfData: file.buffer,
    pages: pageRecords,
  });

  ocrLog("analyze.job_created", { jobId, userId }, {
    totalPages,
    pagesNeedingOcr,
    tokenCostPerPage,
    pagesWithExtractedText: totalPages - pagesNeedingOcr,
  });

  return {
    ok: true as const,
    result: {
      status: "awaiting_confirmation" as const,
      job: pdfOcrJobRepository.toPublicPdfOcrJob(job),
      assembledText,
      pdfPagesTruncated: pagePolicy.truncated,
      originalTotalPages: parsed.totalPages,
    },
  };
}

export async function selectPdfOcrPages(
  jobId: string,
  userId: number,
  pageIndices: number[],
  maxSelectablePages: number,
) {
  if (
    !Array.isArray(pageIndices) ||
    pageIndices.length < 1 ||
    pageIndices.length > maxSelectablePages
  ) {
    return { ok: false as const, status: 400, error: "invalid_page_selection" };
  }

  const uniqueIndices = [...new Set(pageIndices)].sort((a, b) => a - b);
  if (uniqueIndices.length !== pageIndices.length) {
    return { ok: false as const, status: 400, error: "invalid_page_selection" };
  }
  if (uniqueIndices.some((index) => !Number.isInteger(index) || index < 0)) {
    return { ok: false as const, status: 400, error: "invalid_page_selection" };
  }

  const job = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  if (!job) {
    return { ok: false as const, status: 404, error: "job_not_found" };
  }
  if (job.status !== "awaiting_confirmation") {
    return { ok: false as const, status: 409, error: "job_not_startable" };
  }

  const allPages = await pdfOcrJobRepository.selectPdfOcrJobPages(jobId);
  const validIndices = new Set(allPages.map((page) => page.page_index));
  for (const index of uniqueIndices) {
    if (!validIndices.has(index)) {
      return { ok: false as const, status: 400, error: "invalid_page_selection" };
    }
  }

  await pdfOcrJobRepository.deletePdfOcrJobPagesExcept(jobId, uniqueIndices);
  const remainingPages = await pdfOcrJobRepository.selectPdfOcrJobPages(jobId);
  const pagesNeedingOcr = remainingPages.filter(
    (page) => page.status === "needs_ocr",
  ).length;
  const assembledText = pdfOcrJobRepository.assemblePageTexts(remainingPages);

  await pdfOcrJobRepository.updatePdfOcrJobAfterPageSelection(jobId, {
    totalPages: remainingPages.length,
    pagesNeedingOcr,
    assembledText: assembledText || null,
  });

  if (pagesNeedingOcr === 0) {
    if (!assembledText.trim()) {
      await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "failed", {
        errorMessage: "ocr_empty_text",
        clearPdfData: true,
      });
      return { ok: false as const, status: 422, error: "ocr_empty_text" };
    }

    await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "completed", {
      assembledText,
      clearPdfData: true,
    });
    const updated = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
    return {
      ok: true as const,
      result: {
        status: "completed" as const,
        job: pdfOcrJobRepository.toPublicPdfOcrJob(updated!),
        assembledText,
      },
    };
  }

  const updated = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  return {
    ok: true as const,
    result: {
      status: "awaiting_confirmation" as const,
      job: pdfOcrJobRepository.toPublicPdfOcrJob(updated!),
      assembledText,
    },
  };
}

export async function getPdfOcrJobForUser(jobId: string, userId: number) {
  const job = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  if (!job) {
    return { ok: false as const, status: 404, error: "job_not_found" };
  }
  return {
    ok: true as const,
    result: pdfOcrJobRepository.toPublicPdfOcrJob(job),
  };
}

export async function startPdfOcrJob(jobId: string, userId: number) {
  const logCtx = { jobId, userId };
  ocrLog("job.start.request", logCtx);

  const job = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  if (!job) {
    ocrWarn("job.start.not_found", logCtx);
    return { ok: false as const, status: 404, error: "job_not_found" };
  }
  if (job.status === "processing") {
    ocrLog("job.start.already_processing", logCtx, {
      pagesCompleted: job.pages_completed,
      pagesNeedingOcr: job.pages_needing_ocr,
    });
    schedulePdfOcrJobContinue(jobId);
    return { ok: true as const, result: pdfOcrJobRepository.toPublicPdfOcrJob(job) };
  }
  if (job.status === "completed") {
    ocrLog("job.start.already_completed", logCtx);
    return { ok: true as const, result: pdfOcrJobRepository.toPublicPdfOcrJob(job) };
  }
  if (job.status !== "awaiting_confirmation") {
    return { ok: false as const, status: 409, error: "job_not_startable" };
  }
  if (!isOcrAvailable()) {
    return { ok: false as const, status: 422, error: "ocr_unavailable" };
  }

  const settings = await getGenerationSettings();
  const totalTokenCost = estimatePdfOcrTokenCost(job.pages_needing_ocr, settings);
  const chargeResult = await chargePdfOcrTokens(userId, jobId, totalTokenCost, {
    pagesNeedingOcr: job.pages_needing_ocr,
    tokenCostPerPage: job.token_cost_per_page,
  });
  if (chargeResult.ok === false) {
    ocrWarn("job.start.charge_failed", logCtx, {
      status: chargeResult.status,
      error: chargeResult.error,
    });
    return {
      ok: false as const,
      status: chargeResult.status,
      error: chargeResult.error,
    };
  }

  ocrLog("job.start.charged", logCtx, {
    tokensCharged: totalTokenCost,
    pagesNeedingOcr: job.pages_needing_ocr,
    tokenCostPerPage: job.token_cost_per_page,
  });

  await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "processing", {
    tokensCharged: totalTokenCost,
    pagesCompleted: 0,
    errorMessage: null,
  });

  schedulePdfOcrJobContinue(jobId);
  ocrLog("job.start.chain_scheduled", logCtx);

  const updated = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  return {
    ok: true as const,
    result: pdfOcrJobRepository.toPublicPdfOcrJob(updated!),
  };
}

export async function processNextOcrPageInternal(jobId: string) {
  const logCtx = { jobId };
  ocrLog("chain.tick.start", logCtx, { maxPagesPerTick: PDF_OCR_PAGES_PER_STEP });

  const job = await pdfOcrJobRepository.selectPdfOcrJobById(jobId);
  if (!job) {
    ocrWarn("chain.tick.job_not_found", logCtx);
    return { ok: false as const, status: 404, error: "job_not_found" };
  }

  if (
    job.status === "completed" ||
    job.status === "cancelled" ||
    job.status === "failed" ||
    job.status !== "processing"
  ) {
    ocrLog("chain.tick.skip_terminal", logCtx, { status: job.status });
    return { ok: true as const };
  }

  if (await pdfOcrJobRepository.isPdfOcrJobCancelled(jobId)) {
    ocrLog("chain.tick.skip_cancelled", logCtx);
    return { ok: true as const };
  }

  if (!job.pdf_data.length) {
    ocrWarn("chain.tick.pdf_data_missing", logCtx);
    return { ok: false as const, status: 422, error: "pdf_data_missing" };
  }

  let pagesProcessedThisTick = 0;

  for (let batchIndex = 0; batchIndex < PDF_OCR_PAGES_PER_STEP; batchIndex += 1) {
    const currentJob = await pdfOcrJobRepository.selectPdfOcrJobById(jobId);
    if (!currentJob || currentJob.status !== "processing") {
      break;
    }
    if (await pdfOcrJobRepository.isPdfOcrJobCancelled(jobId)) {
      break;
    }
    if (!currentJob.pdf_data.length) {
      break;
    }

    const nextPage = await pdfOcrJobRepository.selectNextPdfOcrJobPageNeedingOcr(jobId);
    if (!nextPage) {
      break;
    }

    ocrLog("chain.tick.process_page", logCtx, {
      pageIndex: nextPage.page_index,
      pageNumber: nextPage.page_index + 1,
      pagesCompleted: currentJob.pages_completed,
      pagesNeedingOcr: currentJob.pages_needing_ocr,
      batchIndex: batchIndex + 1,
      batchSize: PDF_OCR_PAGES_PER_STEP,
    });

    try {
      await processOcrPage(currentJob, nextPage, jobId);
    } catch (error) {
      ocrWarn("page.process.exception", { jobId, pageIndex: nextPage.page_index }, {
        error: error instanceof Error ? error.message : String(error),
      });
      await pdfOcrJobRepository.updatePdfOcrJobPageResult(nextPage.id, {
        status: "ocr_failed",
        text: null,
      });
      await pdfOcrJobRepository.incrementPdfOcrJobPagesCompleted(jobId);
      const assembledText =
        await pdfOcrJobRepository.rebuildPdfOcrJobAssembledText(jobId);
      await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "processing", {
        assembledText: assembledText || null,
      });
    }

    pagesProcessedThisTick += 1;
  }

  if (pagesProcessedThisTick === 0) {
    const nextPage = await pdfOcrJobRepository.selectNextPdfOcrJobPageNeedingOcr(jobId);
    if (!nextPage) {
      ocrLog("chain.tick.no_pages_left", logCtx, {
        pagesCompleted: job.pages_completed,
        pagesNeedingOcr: job.pages_needing_ocr,
      });
      await finalizePdfOcrJobIfDone(jobId);
    }
    return { ok: true as const };
  }

  ocrLog("chain.tick.batch_done", logCtx, { pagesProcessedThisTick });

  await finalizePdfOcrJobIfDone(jobId);

  const updated = await pdfOcrJobRepository.selectPdfOcrJobById(jobId);
  if (updated?.status === "processing") {
    ocrLog("chain.tick.schedule_next", logCtx, {
      pagesCompleted: updated.pages_completed,
    });
    schedulePdfOcrJobContinue(jobId);
  } else {
    ocrLog("chain.tick.done", logCtx, { status: updated?.status ?? "unknown" });
  }

  return { ok: true as const };
}

export async function cancelPdfOcrJob(jobId: string, userId: number) {
  const logCtx = { jobId, userId };
  ocrLog("job.cancel.request", logCtx);

  const job = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  if (!job) {
    return { ok: false as const, status: 404, error: "job_not_found" };
  }
  if (job.status === "completed" || job.status === "cancelled") {
    return { ok: true as const, result: pdfOcrJobRepository.toPublicPdfOcrJob(job) };
  }
  if (job.status !== "processing" && job.status !== "awaiting_confirmation") {
    return { ok: false as const, status: 409, error: "job_not_cancellable" };
  }

  const previousStatus = job.status;

  if (previousStatus === "processing" && job.tokens_charged > 0) {
    const remainingPages = Math.max(0, job.pages_needing_ocr - job.pages_completed);
    const refundAmount = remainingPages * job.token_cost_per_page;
    ocrLog("job.cancel.refund", logCtx, {
      refundAmount,
      remainingPages,
      pagesCompleted: job.pages_completed,
    });
    await refundPdfOcrTokens(userId, jobId, refundAmount, "cancelled");
  }

  const assembledText = await pdfOcrJobRepository.rebuildPdfOcrJobAssembledText(jobId);
  await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "cancelled", {
    errorMessage: "cancelled by user",
    assembledText: assembledText || null,
    clearPdfData: true,
  });

  ocrLog("job.cancel.done", logCtx, { assembledChars: assembledText.length });

  const updated = await pdfOcrJobRepository.selectPdfOcrJobForUser(jobId, userId);
  return {
    ok: true as const,
    result: pdfOcrJobRepository.toPublicPdfOcrJob(updated!),
  };
}

async function finalizePdfOcrJobIfDone(jobId: string): Promise<void> {
  const logCtx = { jobId };
  const nextPage = await pdfOcrJobRepository.selectNextPdfOcrJobPageNeedingOcr(jobId);
  if (nextPage) {
    return;
  }

  ocrLog("job.finalize.start", logCtx);

  const job = await pdfOcrJobRepository.selectPdfOcrJobById(jobId);
  if (!job) {
    ocrWarn("job.finalize.job_not_found", logCtx);
    return;
  }

  const assembledText = await pdfOcrJobRepository.rebuildPdfOcrJobAssembledText(jobId);
  if (!assembledText.trim()) {
    if (job.tokens_charged > 0) {
      ocrLog("job.finalize.refund_full", logCtx, {
        refundAmount: job.tokens_charged,
        reason: "ocr_empty_text",
      });
      await refundPdfOcrTokens(job.user_id, jobId, job.tokens_charged, "ocr_empty_text");
    }
    await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "failed", {
      errorMessage: "ocr_empty_text",
      clearPdfData: true,
    });
    ocrWarn("job.finalize.failed", logCtx, { error: "ocr_empty_text" });
    return;
  }

  const pages = await pdfOcrJobRepository.selectPdfOcrJobPages(jobId);
  const failedOcrPageCount = pages.filter((page) => page.status === "ocr_failed").length;
  if (failedOcrPageCount > 0 && job.token_cost_per_page > 0) {
    const refundAmount = failedOcrPageCount * job.token_cost_per_page;
    ocrLog("job.finalize.refund_partial", logCtx, {
      refundAmount,
      failedOcrPageCount,
    });
    await refundPdfOcrTokens(job.user_id, jobId, refundAmount, "partial_ocr_failed");
  }

  await pdfOcrJobRepository.updatePdfOcrJobStatus(jobId, "completed", {
    assembledText,
    clearPdfData: true,
  });
  ocrLog("job.finalize.completed", logCtx, {
    assembledChars: assembledText.length,
    failedOcrPageCount,
    pagesCompleted: job.pages_completed,
  });
}

async function processOcrPage(
  job: pdfOcrJobRepository.PdfOcrJobRow & { pdf_data: Buffer },
  page: pdfOcrJobRepository.PdfOcrJobPageRow,
  requestId: string,
): Promise<void> {
  const logCtx = {
    jobId: job.id,
    requestId,
    pageIndex: page.page_index,
    pageNumber: page.page_index + 1,
  };
  ocrLog("page.process.start", logCtx);

  const pngBuffer = await renderPdfPageToPng(job.pdf_data, page.page_index + 1, undefined, {
    jobId: job.id,
    pageIndex: page.page_index,
  });
  const text = await extractTextWithOcrSpace(
    pngBuffer,
    logCtx,
    {
      mimeType: "image/png",
      filename: `page-${page.page_index + 1}.png`,
    },
  );

  if (text) {
    await pdfOcrJobRepository.updatePdfOcrJobPageResult(page.id, {
      status: "ocr_completed",
      text,
    });
  } else {
    await pdfOcrJobRepository.updatePdfOcrJobPageResult(page.id, {
      status: "ocr_failed",
      text: null,
    });
  }

  const pagesCompleted = await pdfOcrJobRepository.incrementPdfOcrJobPagesCompleted(job.id);
  const assembledText = await pdfOcrJobRepository.rebuildPdfOcrJobAssembledText(job.id);
  await pdfOcrJobRepository.updatePdfOcrJobStatus(job.id, "processing", {
    assembledText: assembledText || null,
  });

  ocrLog("page.process.done", logCtx, {
    status: text ? "ocr_completed" : "ocr_failed",
    chars: text.length,
    pagesCompleted,
    assembledChars: assembledText.length,
  });
}

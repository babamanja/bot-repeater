import { randomUUID } from "node:crypto";

import { UPLOAD_MAX_BYTES_BASIC } from "../config/uploadLimits.js";
import {
  applyTextLengthPolicy,
  type GenerationUploadProfile,
} from "../config/generationUploadProfile.js";
import * as tokenRepository from "../db/tokenRepository.js";
import {
  estimateOcrImageTokenCost,
  getGenerationSettings,
} from "./generationSettings.service.js";
import {
  extractTextWithOcrSpace,
  getOcrRuntimeInfo,
  isOcrAvailable,
} from "./ocrExtractor.js";
import { ocrLog, ocrWarn } from "./ocrLogger.js";
import { extractTextWithPdfJs } from "./pdfExtractor.js";
import { ensurePdfRuntime } from "./pdfRuntime.js";

type FileExtractLogContext = {
  requestId?: string;
  maxBytes?: number;
  userId?: number;
  uploadProfile?: GenerationUploadProfile;
};

export type FileExtractionMethod = "pdf_text" | "ocr";

export type FileExtractSuccess = {
  text: string;
  pages: number;
  chars: number;
  extractionMethod: FileExtractionMethod;
  tokensCharged?: number;
  textTruncated?: boolean;
};

type UploadFileInput = {
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
  size?: number;
};

const SUPPORTED_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function inferUploadMime(file: UploadFileInput): string | null {
  const mime = file.mimetype?.trim().toLowerCase();
  if (mime && SUPPORTED_MIMES.has(mime)) {
    return mime;
  }

  const name = file.originalname?.trim().toLowerCase() ?? "";
  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (name.endsWith(".png")) {
    return "image/png";
  }
  if (name.endsWith(".webp")) {
    return "image/webp";
  }
  return null;
}

function defaultOcrFilename(mime: string, originalname?: string): string {
  if (originalname?.trim()) {
    return originalname.trim();
  }
  if (mime === "image/jpeg") {
    return "photo.jpg";
  }
  if (mime === "image/png") {
    return "photo.png";
  }
  if (mime === "image/webp") {
    return "photo.webp";
  }
  return "document.pdf";
}

function ocrUnavailableError() {
  return {
    ok: false as const,
    status: 422,
    error: "ocr_unavailable",
  };
}

function ocrEmptyTextError() {
  return {
    ok: false as const,
    status: 422,
    error: "ocr_empty_text",
  };
}

async function chargeOcrImageTokens(
  userId: number,
  requestId: string,
  amount: number,
  metadata: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (amount < 1) {
    return { ok: true };
  }
  try {
    await tokenRepository.spendTokensForUser({
      userId,
      amount,
      referenceId: requestId,
      metadata: {
        source: "ocr_image",
        ...metadata,
      },
    });
    return { ok: true };
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

async function refundOcrImageTokens(
  userId: number,
  requestId: string,
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
    referenceId: requestId,
    idempotencyKey: tokenRepository.ocrImageRefundIdempotencyKey(
      requestId,
      reason,
    ),
    metadata: { source: "ocr_image_refund", reason },
  });
}

async function extractImageText(
  file: UploadFileInput,
  mime: string,
  ctx: FileExtractLogContext,
) {
  if (!isOcrAvailable()) {
    return ocrUnavailableError();
  }

  const userId = ctx.userId;
  if (!Number.isInteger(userId) || userId! < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const requestId = ctx.requestId?.trim() || randomUUID();
  const logCtx = { requestId, userId };
  const settings = await getGenerationSettings();
  const tokenCost = estimateOcrImageTokenCost(settings);

  ocrLog("image.start", logCtx, {
    filename: file.originalname,
    mimetype: mime,
    tokenCost,
  });

  const chargeResult = await chargeOcrImageTokens(userId!, requestId, tokenCost, {
    filename: file.originalname ?? undefined,
    mimetype: mime,
  });
  if (chargeResult.ok === false) {
    return {
      ok: false as const,
      status: chargeResult.status,
      error: chargeResult.error,
    };
  }

  const text = await extractTextWithOcrSpace(file.buffer!, logCtx, {
    mimeType: mime,
    filename: defaultOcrFilename(mime, file.originalname),
  });
  if (!text) {
    ocrLog("image.refund", logCtx, { refundAmount: tokenCost, reason: "ocr_empty_text" });
    await refundOcrImageTokens(userId!, requestId, tokenCost, "ocr_empty_text");
    return ocrEmptyTextError();
  }

  ocrLog("image.done", logCtx, { chars: text.length, tokensCharged: tokenCost });

  return {
    ok: true as const,
    result: {
      text,
      pages: 1,
      chars: text.length,
      extractionMethod: "ocr" as const,
      tokensCharged: tokenCost,
    },
  };
}

async function extractPdfTextInternal(
  file: UploadFileInput,
  ctx: FileExtractLogContext,
) {
  try {
    await ensurePdfRuntime();
    const parsed = await extractTextWithPdfJs(file.buffer!);
    let text = parsed.text;
    let pages = parsed.pages;
    let extractionMethod: FileExtractionMethod = "pdf_text";

    if (!text) {
      console.info("[files][pdf] Empty text from parser; trying OCR", {
        requestId: ctx.requestId ?? undefined,
        pagesFromParser: pages,
        size: file.size ?? undefined,
      });
      if (!isOcrAvailable()) {
        return ocrUnavailableError();
      }
      text = await extractTextWithOcrSpace(file.buffer!, ctx, {
        mimeType: "application/pdf",
        filename: defaultOcrFilename("application/pdf", file.originalname),
      });
      pages = pages > 0 ? pages : 0;
      extractionMethod = "ocr";
    }

    if (!text) {
      const ocrInfo = getOcrRuntimeInfo();
      console.warn("[files][pdf] Text extraction returned empty", {
        requestId: ctx.requestId ?? undefined,
        size: file.size ?? undefined,
        ocrEnabled: ocrInfo.enabled,
        hasOcrApiKey: ocrInfo.hasApiKey,
      });
      return ocrEmptyTextError();
    }

    return {
      ok: true as const,
      result: {
        text,
        pages,
        chars: text.length,
        extractionMethod,
      },
    };
  } catch (error) {
    console.warn("[files][pdf] Parser threw; trying OCR fallback", {
      requestId: ctx.requestId ?? undefined,
      size: file.size ?? undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    if (!isOcrAvailable()) {
      return {
        ok: false as const,
        status: 422,
        error: "pdf_parse_failed",
      };
    }
    const fallbackText = await extractTextWithOcrSpace(file.buffer!, ctx, {
      mimeType: "application/pdf",
      filename: defaultOcrFilename("application/pdf", file.originalname),
    });
    if (fallbackText) {
      return {
        ok: true as const,
        result: {
          text: fallbackText,
          pages: 0,
          chars: fallbackText.length,
          extractionMethod: "ocr" as const,
        },
      };
    }
    return {
      ok: false as const,
      status: 422,
      error: "pdf_parse_failed",
    };
  }
}

function finalizeExtractedText(
  result: FileExtractSuccess,
  profile: GenerationUploadProfile | undefined,
):
  | { ok: true; result: FileExtractSuccess }
  | { ok: false; status: number; error: string } {
  if (!profile) {
    return { ok: true, result };
  }
  const applied = applyTextLengthPolicy(result.text, profile);
  if (applied.ok === false) {
    return { ok: false, status: 413, error: applied.error };
  }
  return {
    ok: true,
    result: {
      ...result,
      text: applied.text,
      chars: applied.text.length,
      textTruncated: applied.truncated,
    },
  };
}

/** @deprecated Use extractTextFromUpload */
export async function extractTextFromPdf(
  file: UploadFileInput,
  ctx: FileExtractLogContext = {},
) {
  return extractTextFromUpload(file, ctx);
}

export async function extractTextFromUpload(
  file: UploadFileInput,
  ctx: FileExtractLogContext = {},
) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    console.warn("[files] Missing file buffer", {
      requestId: ctx.requestId ?? undefined,
      mimetype: file?.mimetype ?? undefined,
      size: file?.size ?? undefined,
    });
    return { ok: false as const, status: 400, error: "file_required" };
  }

  const mime = inferUploadMime(file);
  if (!mime) {
    console.warn("[files] Unsupported file type", {
      requestId: ctx.requestId ?? undefined,
      mimetype: file.mimetype ?? undefined,
      originalname: file.originalname ?? undefined,
      size: file.size ?? undefined,
    });
    return {
      ok: false as const,
      status: 400,
      error: "unsupported_file_type",
    };
  }

  const maxBytes = ctx.uploadProfile?.maxBytes ?? ctx.maxBytes ?? UPLOAD_MAX_BYTES_BASIC;
  if ((file.size ?? 0) > maxBytes) {
    console.warn("[files] File too large", {
      requestId: ctx.requestId ?? undefined,
      size: file.size ?? undefined,
      maxBytes,
      mimetype: mime,
    });
    return { ok: false as const, status: 413, error: "file_too_large" };
  }

  const raw = isImageMime(mime)
    ? await extractImageText(file, mime, ctx)
    : await extractPdfTextInternal(file, ctx);
  if (raw.ok === false) {
    return raw;
  }
  return finalizeExtractedText(raw.result, ctx.uploadProfile);
}

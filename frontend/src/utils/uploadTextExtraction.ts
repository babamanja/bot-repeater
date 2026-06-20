import {
  analyzePdfUpload,
  extractUploadText,
  getPdfOcrJob,
  startPdfOcrJob,
  type FileExtractionMethod,
  type PdfOcrJob,
} from "../api/file";
import {
  applyTextLengthPolicy,
  getUploadProfileQueryParam,
  type GenerationUploadProfile,
} from "../config/generationUploadProfile";
import {
  isImageUploadFile,
  isPdfUploadFile,
} from "./fileExtract";

const PDF_OCR_POLL_INTERVAL_MS = 2000;

export class UploadTextExtractionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "UploadTextExtractionError";
  }
}

export type ExtractedUploadText = {
  text: string;
  textTruncated: boolean;
  pdfPagesTruncated: boolean;
  extractionMethod?: FileExtractionMethod;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForPdfOcrJobCompletion(jobId: string): Promise<PdfOcrJob> {
  for (;;) {
    const job = await getPdfOcrJob(jobId);
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return job;
    }
    await sleep(PDF_OCR_POLL_INTERVAL_MS);
  }
}

function finalizeText(
  rawText: string,
  profile: GenerationUploadProfile,
  flags: { pdfPagesTruncated?: boolean; extractionMethod?: FileExtractionMethod },
): ExtractedUploadText {
  const applied = applyTextLengthPolicy(rawText, profile);
  if (applied.ok === false) {
    throw new UploadTextExtractionError(
      `TEXT_TOO_LONG:${applied.maxChars}`,
      "TEXT_TOO_LONG",
    );
  }
  return {
    text: applied.text,
    textTruncated: applied.truncated,
    pdfPagesTruncated: flags.pdfPagesTruncated ?? false,
    extractionMethod: flags.extractionMethod,
  };
}

async function extractPdfWithProfile(
  file: File,
  profile: GenerationUploadProfile,
): Promise<ExtractedUploadText> {
  const uploadProfile = getUploadProfileQueryParam(profile);
  const analyzed = await analyzePdfUpload(file, uploadProfile);

  if (analyzed.status === "completed") {
    return finalizeText(analyzed.assembledText, profile, {
      extractionMethod: "pdf_text",
      pdfPagesTruncated: analyzed.pdfPagesTruncated ?? false,
    });
  }

  if (profile.ocrConfirmRequired) {
    throw new UploadTextExtractionError(
      "pdf_ocr_confirmation_required",
      "pdf_ocr_confirmation_required",
    );
  }

  const started = await startPdfOcrJob(analyzed.job.id);
  let job = started;
  if (job.status === "processing" || job.status === "awaiting_confirmation") {
    job = await waitForPdfOcrJobCompletion(job.id);
  }

  if (job.status === "failed") {
    throw new UploadTextExtractionError(job.errorMessage ?? "ocr_empty_text", "ocr_empty_text");
  }
  if (job.status === "cancelled") {
    throw new UploadTextExtractionError("pdf_ocr_cancelled", "pdf_ocr_cancelled");
  }

  const analyzedPreviewText = "assembledText" in analyzed ? analyzed.assembledText : "";
  const assembled = job.assembledText ?? analyzedPreviewText ?? "";
  return finalizeText(assembled, profile, {
    pdfPagesTruncated: analyzed.pdfPagesTruncated ?? false,
    extractionMethod: "ocr",
  });
}

export async function extractTextFromUploadFile(
  file: File,
  profile: GenerationUploadProfile,
): Promise<ExtractedUploadText> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".txt")) {
    const raw = await file.text();
    return finalizeText(raw, profile, { extractionMethod: "pdf_text" });
  }

  if (isPdfUploadFile(file)) {
    return extractPdfWithProfile(file, profile);
  }

  if (isImageUploadFile(file)) {
    const uploadProfile = getUploadProfileQueryParam(profile);
    const extracted = await extractUploadText(file, uploadProfile);
    return finalizeText(extracted.text, profile, {
      extractionMethod: extracted.extractionMethod,
    });
  }

  const uploadProfile = getUploadProfileQueryParam(profile);
  const extracted = await extractUploadText(file, uploadProfile);
  return finalizeText(extracted.text, profile, {
    extractionMethod: extracted.extractionMethod,
  });
}

import { ocrLog, ocrWarn, type OcrLogContext } from "./ocrLogger.js";

export type OcrExtractLogContext = OcrLogContext;

export type OcrExtractOptions = {
  mimeType?: string;
  filename?: string;
};

const DEFAULT_OCR_MIME = "application/pdf";
const DEFAULT_OCR_FILENAME = "document.pdf";

function isOcrFallbackEnabled(): boolean {
  return (
    (process.env.PDF_OCR_FALLBACK_ENABLED?.trim().toLowerCase() ?? "true") ===
    "true"
  );
}

function getOcrSpaceApiKey(): string {
  return process.env.OCR_SPACE_API_KEY?.trim() ?? "";
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function getOcrRuntimeInfo(): { enabled: boolean; hasApiKey: boolean } {
  return {
    enabled: isOcrFallbackEnabled(),
    hasApiKey: Boolean(getOcrSpaceApiKey()),
  };
}

export function isOcrAvailable(): boolean {
  const info = getOcrRuntimeInfo();
  return info.enabled && info.hasApiKey;
}

export async function extractTextWithOcrSpace(
  fileBuffer: Buffer,
  ctx: OcrExtractLogContext,
  options: OcrExtractOptions = {},
): Promise<string> {
  const apiKey = getOcrSpaceApiKey();
  const enabled = isOcrFallbackEnabled();
  if (!enabled || !apiKey) {
    ocrWarn("ocr.space.skipped", ctx, {
      enabled,
      hasApiKey: Boolean(apiKey),
    });
    return "";
  }

  const mimeType = options.mimeType?.trim() || DEFAULT_OCR_MIME;
  const filename = options.filename?.trim() || DEFAULT_OCR_FILENAME;

  ocrLog("ocr.space.request", ctx, {
    filename,
    mimeType,
    bytes: fileBuffer.length,
  });

  const formData = new FormData();
  const bytes = Uint8Array.from(fileBuffer);
  formData.append("file", new Blob([bytes], { type: mimeType }), filename);
  formData.append("isOverlayRequired", "false");
  formData.append("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey,
    },
    body: formData,
  });
  if (!response.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = (await response.text()).slice(0, 300);
    } catch {
      // ignore read errors
    }
    ocrWarn("ocr.space.http_error", ctx, {
      status: response.status,
      statusText: response.statusText,
      bodySnippet,
    });
    return "";
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    ocrWarn("ocr.space.invalid_json", ctx, {
      error: safeErrorMessage(error),
    });
    return "";
  }

  const typed = payload as {
    ParsedResults?: Array<{ ParsedText?: string }>;
    IsErroredOnProcessing?: boolean;
    ErrorMessage?: string | string[];
    ErrorDetails?: string;
  };

  if (typed.IsErroredOnProcessing || typed.ErrorMessage || typed.ErrorDetails) {
    ocrWarn("ocr.space.payload_error", ctx, {
      isErroredOnProcessing: typed.IsErroredOnProcessing ?? undefined,
      errorMessage: typed.ErrorMessage ?? undefined,
      errorDetails: typed.ErrorDetails ?? undefined,
    });
    if (typed.IsErroredOnProcessing) {
      return "";
    }
  }

  const text =
    typed.ParsedResults?.map((item) => item.ParsedText ?? "")
      .join("\n")
      .trim() ?? "";

  ocrLog("ocr.space.done", ctx, {
    chars: text.length,
    success: text.length > 0,
  });

  return text;
}

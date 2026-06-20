export type OcrLogContext = {
  jobId?: string;
  requestId?: string;
  userId?: number;
  pageIndex?: number;
  pageNumber?: number;
};

function mergeFields(
  ctx?: OcrLogContext,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = { ...extra };
  if (ctx?.jobId) {
    fields.jobId = ctx.jobId;
  }
  if (ctx?.requestId) {
    fields.requestId = ctx.requestId;
  }
  if (ctx?.userId != null) {
    fields.userId = ctx.userId;
  }
  if (ctx?.pageIndex != null) {
    fields.pageIndex = ctx.pageIndex;
  }
  if (ctx?.pageNumber != null) {
    fields.pageNumber = ctx.pageNumber;
  }
  return fields;
}

export function ocrLog(
  step: string,
  ctx?: OcrLogContext,
  extra?: Record<string, unknown>,
): void {
  console.info("[pdf-ocr]", step, mergeFields(ctx, extra));
}

export function ocrWarn(
  step: string,
  ctx?: OcrLogContext,
  extra?: Record<string, unknown>,
): void {
  console.warn("[pdf-ocr]", step, mergeFields(ctx, extra));
}

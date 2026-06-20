import { createCanvas } from "@napi-rs/canvas";
import { ensurePdfRuntime, getPdfJsDocumentInitOptions } from "./pdfRuntime.js";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

import { PDF_OCR_RENDER_SCALE } from "../config/pdfOcr.js";
import { ocrLog, ocrWarn } from "./ocrLogger.js";

export async function renderPdfPageToPng(
  pdfBuffer: Buffer,
  pageNumber: number,
  scale = PDF_OCR_RENDER_SCALE,
  logCtx?: { jobId?: string; pageIndex?: number },
): Promise<Buffer> {
  ocrLog("page.render.start", {
    jobId: logCtx?.jobId,
    pageIndex: logCtx?.pageIndex,
    pageNumber,
  }, { scale, pdfBytes: pdfBuffer.length });

  await ensurePdfRuntime();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: Uint8Array.from(pdfBuffer),
    ...getPdfJsDocumentInitOptions(),
  });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvas = createCanvas(width, height);

    try {
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise;
    } catch (error) {
      ocrWarn("page.render.failed", {
        jobId: logCtx?.jobId,
        pageIndex: logCtx?.pageIndex,
        pageNumber,
      }, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      page.cleanup();
    }

    const pngBuffer = canvas.toBuffer("image/png");
    ocrLog("page.render.done", {
      jobId: logCtx?.jobId,
      pageIndex: logCtx?.pageIndex,
      pageNumber,
    }, {
      pngBytes: pngBuffer.length,
      width,
      height,
    });
    return pngBuffer;
  } finally {
    await loadingTask.destroy();
  }
}
